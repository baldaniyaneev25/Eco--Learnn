import { Types } from "mongoose";
import { audit, SYSTEM_ACTOR, type Actor } from "@/lib/audit";
import { env } from "@/lib/env";
import { DataSource, type DataSourceDoc } from "@/lib/models/DataSource";
import { SyncJob } from "@/lib/models/SyncJob";
import { FetchError, safeFetch } from "@/lib/security/safe-fetch";
import { getAdapter } from "./adapters";
import type { Fetcher, SourceLike } from "./adapters/types";
import { alertAdmins } from "./alerts";
import { ingestIndicators } from "./indicators";
import { ingestItems } from "./pipeline";

export const LOCK_TTL_MS = 15 * 60_000;
const MAX_BACKOFF_MINUTES = 24 * 60;

export class SyncNotAllowedError extends Error {
  constructor(
    message: string,
    readonly status: number = 409,
  ) {
    super(message);
    this.name = "SyncNotAllowedError";
  }
}

export interface SyncDeps {
  fetch?: Fetcher;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type SourceWithId = DataSourceDoc & { _id: Types.ObjectId };

/** Minutes between scheduled runs: the configured interval, never below the permitted floor. */
export function effectiveIntervalMinutes(source: SourceLike & { fetchIntervalMinutes: number }): number {
  return Math.max(source.fetchIntervalMinutes, getAdapter(source.sourceType).minIntervalMinutes(source));
}

/** Delay before the next scheduled attempt after `failures` consecutive failures. */
export function backoffDelayMinutes(intervalMinutes: number, failures: number): number {
  if (failures <= 0) return intervalMinutes;
  return Math.max(intervalMinutes, Math.min(intervalMinutes * 2 ** Math.min(failures, 10), MAX_BACKOFF_MINUTES));
}

/** Retries transient fetch failures with exponential backoff (honouring Retry-After). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 1000, maxDelayMs = 30_000, sleep = defaultSleep } = {},
): Promise<{ value: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return { value: await fn(), attempts: attempt };
    } catch (err) {
      lastError = err;
      const retryable = err instanceof FetchError && err.retryable;
      if (!retryable || attempt === attempts) break;
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      await sleep(Math.min(maxDelayMs, Math.max(backoff, (err as FetchError).retryAfterMs ?? 0)));
    }
  }
  throw lastError;
}

/**
 * Creates a queued sync job for a source, enforcing that it is enabled, its
 * terms have been reviewed, it is not fetched more often than permitted and
 * there is no queued/running job already.
 */
export async function enqueueSync(
  sourceId: string,
  opts: { trigger: "scheduled" | "manual" | "retry"; actor?: Actor; retryOf?: string; now?: Date },
) {
  const now = opts.now ?? new Date();
  const source = await DataSource.findById(sourceId);
  if (!source) throw new SyncNotAllowedError("Data source not found", 404);
  if (!source.isEnabled) throw new SyncNotAllowedError("Data source is disabled");
  if (!source.isSample && !source.accessReview?.termsReviewed) {
    throw new SyncNotAllowedError("Terms of use have not been reviewed for this source");
  }

  const existing = await SyncJob.findOne({ sourceId: source._id, status: { $in: ["queued", "running"] } });
  if (existing) return { job: existing, existing: true };

  const floor = getAdapter(source.sourceType).minIntervalMinutes(source);
  if (source.lastFetchedAt) {
    const nextAllowed = source.lastFetchedAt.getTime() + floor * 60_000;
    if (nextAllowed > now.getTime()) {
      const minutes = Math.ceil((nextAllowed - now.getTime()) / 60_000);
      throw new SyncNotAllowedError(
        `This source may be fetched at most every ${floor} minute(s). Try again in ${minutes} minute(s).`,
        429,
      );
    }
  }

  const job = await SyncJob.create({
    sourceId: source._id,
    sourceName: source.name,
    trigger: opts.trigger,
    triggeredBy: opts.actor?.email ?? "scheduler",
    retryOf: opts.retryOf ? new Types.ObjectId(opts.retryOf) : undefined,
    queuedAt: now,
    status: "queued",
  });
  if (opts.trigger !== "scheduled" && opts.actor) {
    await audit(opts.actor, `sync.${opts.trigger}`, "dataSource", String(source._id), `Requested ${opts.trigger} sync of "${source.name}"`, {
      jobId: String(job._id),
    });
  }
  return { job, existing: false };
}

async function recordFailure(source: SourceWithId, message: string, now: Date) {
  const failures = (source.consecutiveFailures ?? 0) + 1;
  const interval = effectiveIntervalMinutes(source as unknown as SourceLike & { fetchIntervalMinutes: number });
  const shouldAlert = failures >= env.alertFailureThreshold && !source.alertActive;
  await DataSource.updateOne(
    { _id: source._id },
    {
      $set: {
        lastFetchedAt: now,
        consecutiveFailures: failures,
        lastError: message.slice(0, 1000),
        nextRunAt: new Date(now.getTime() + backoffDelayMinutes(interval, failures) * 60_000),
        ...(shouldAlert ? { alertActive: true } : {}),
      },
    },
  );
  if (shouldAlert) await alertAdmins(String(source._id), source.name, failures, message);
}

/** Runs one queued job. Safe to call from several workers: only one claims it. */
export async function runJob(jobId: string, deps: SyncDeps = {}) {
  const now = (deps.now ?? (() => new Date()))();
  const job = await SyncJob.findOneAndUpdate(
    { _id: jobId, status: "queued" },
    { $set: { status: "running", startedAt: now } },
    { returnDocument: "after" },
  );
  if (!job) return null;

  // Per-source lock: prevents concurrent duplicate syncs of the same source.
  const source = (await DataSource.findOneAndUpdate(
    {
      _id: job.sourceId,
      isEnabled: true,
      $or: [{ "syncLock.lockedUntil": { $exists: false } }, { "syncLock.lockedUntil": null }, { "syncLock.lockedUntil": { $lte: now } }],
    },
    { $set: { syncLock: { jobId: job._id, lockedUntil: new Date(now.getTime() + LOCK_TTL_MS) } } },
    { returnDocument: "after" },
  ).lean()) as SourceWithId | null;

  if (!source) {
    job.status = "skipped";
    job.errorSummary = "Source is disabled or another sync is already running";
    job.finishedAt = new Date();
    await job.save();
    return job;
  }

  const sourceLike = source as unknown as SourceLike;
  try {
    const adapter = getAdapter(source.sourceType);
    adapter.validateConfig(sourceLike);
    const fetcher = deps.fetch ?? safeFetch;
    const { value: result } = await withRetry(
      () => {
        job.attempts = (job.attempts ?? 0) + 1;
        return adapter.fetch({ source: sourceLike, fetch: fetcher, now });
      },
      { sleep: deps.sleep },
    );

    const counts =
      result.kind === "items" ? await ingestItems(sourceLike, result.items, now) : await ingestIndicators(sourceLike, result.indicators, now);
    const fetched = result.kind === "items" ? result.items.length : result.indicators.length;
    const failed = counts.failed + result.recordErrors.length;
    const succeededRecords = counts.created + counts.updated + counts.duplicate + counts.skipped;

    job.itemsFetched = fetched + result.recordErrors.length;
    job.itemsCreated = counts.created;
    job.itemsUpdated = counts.updated;
    job.itemsSkipped = counts.skipped;
    job.itemsDuplicate = counts.duplicate;
    job.itemsFailed = failed;
    job.set("recordErrors", [...result.recordErrors, ...counts.recordErrors].slice(0, 100));
    job.status = failed === 0 ? "succeeded" : succeededRecords > 0 ? "partial" : "failed";
    job.retryable = job.status !== "succeeded";
    if (failed > 0) job.errorSummary = `${failed} record(s) failed validation or storage`;
    job.finishedAt = new Date();
    await job.save();

    if (job.status === "failed") {
      await recordFailure(source, job.errorSummary ?? "All records failed", now);
    } else {
      const interval = effectiveIntervalMinutes(source as unknown as SourceLike & { fetchIntervalMinutes: number });
      await DataSource.updateOne(
        { _id: source._id },
        {
          $set: {
            lastFetchedAt: now,
            lastSuccessfulFetchAt: now,
            consecutiveFailures: 0,
            alertActive: false,
            nextRunAt: new Date(now.getTime() + interval * 60_000),
          },
          $unset: { lastError: 1 },
        },
      );
    }
    await audit(SYSTEM_ACTOR, "sync.import", "dataSource", String(source._id), `Sync of "${source.name}" ${job.status}`, {
      jobId: String(job._id),
      created: counts.created,
      updated: counts.updated,
      duplicate: counts.duplicate,
      skipped: counts.skipped,
      failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.errorSummary = message.slice(0, 1000);
    job.retryable = err instanceof FetchError ? err.retryable : false;
    job.finishedAt = new Date();
    await job.save();
    await recordFailure(source, message, now);
  } finally {
    await DataSource.updateOne({ _id: source._id, "syncLock.jobId": job._id }, { $unset: { syncLock: 1 } });
  }
  return job;
}

/** Marks jobs that have been "running" longer than the lock TTL as failed. */
export async function recoverStaleJobs(now = new Date()) {
  const cutoff = new Date(now.getTime() - LOCK_TTL_MS);
  const stale = await SyncJob.find({ status: "running", startedAt: { $lt: cutoff } });
  for (const job of stale) {
    job.status = "failed";
    job.errorSummary = "Job did not finish (worker stopped or exceeded its time limit)";
    job.retryable = true;
    job.finishedAt = now;
    await job.save();
    await DataSource.updateOne({ _id: job.sourceId, "syncLock.jobId": job._id }, { $unset: { syncLock: 1 } });
  }
  return stale.length;
}

/**
 * One scheduler tick: recover stale jobs, run queued jobs, then enqueue and
 * run every enabled source whose next run is due. Stops starting new work
 * once the time budget is spent, so it fits inside a cron invocation.
 */
export async function runDueSyncs({ budgetMs = 50_000, ...deps }: SyncDeps & { budgetMs?: number } = {}) {
  const clock = deps.now ?? (() => new Date());
  const started = Date.now();
  const outOfTime = () => Date.now() - started > budgetMs;
  const summary = { recovered: 0, ran: 0, skipped: 0, errors: [] as string[] };

  summary.recovered = await recoverStaleJobs(clock());

  const queued = await SyncJob.find({ status: "queued" }).sort({ queuedAt: 1 }).limit(20);
  for (const job of queued) {
    if (outOfTime()) return summary;
    await runJob(String(job._id), deps);
    summary.ran++;
  }

  const now = clock();
  const due = await DataSource.find({
    isEnabled: true,
    $or: [{ nextRunAt: { $lte: now } }, { nextRunAt: null }, { nextRunAt: { $exists: false } }],
  }).sort({ nextRunAt: 1 });
  for (const source of due) {
    if (outOfTime()) break;
    try {
      const { job, existing } = await enqueueSync(String(source._id), { trigger: "scheduled", now });
      if (!existing) {
        await runJob(String(job._id), deps);
        summary.ran++;
      }
    } catch (err) {
      summary.skipped++;
      if (!(err instanceof SyncNotAllowedError)) summary.errors.push(`${source.name}: ${(err as Error).message}`);
    }
  }
  return summary;
}
