import { EconomicIndicator } from "@/lib/models/EconomicIndicator";
import type { RawIndicator, RecordError, SourceLike } from "./adapters/types";
import type { ItemCounts } from "./pipeline";

function sameValue(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/**
 * Stores indicator observations. A changed value for an existing
 * (indicator, geography, period) is stored as a new "revised" record and the
 * previous one is kept with isLatest=false, so history is never lost.
 * New and revised values start unverified until an editor checks them.
 */
export async function ingestIndicators(source: SourceLike, raws: RawIndicator[], now = new Date()): Promise<ItemCounts> {
  const counts: ItemCounts = { created: 0, updated: 0, skipped: 0, duplicate: 0, failed: 0, recordErrors: [], createdIds: [] };

  for (const raw of raws) {
    const key = `${raw.indicatorCode}:${raw.geography}:${raw.referencePeriod}`;
    try {
      if (!Number.isFinite(raw.value)) throw new Error("Value is not a finite number");
      if (!raw.unit || !raw.referencePeriod) throw new Error("Unit and reference period are required");

      const base = {
        indicatorCode: raw.indicatorCode,
        name: raw.name,
        nameGu: raw.nameGu,
        description: raw.description,
        descriptionGu: raw.descriptionGu,
        value: raw.value,
        unit: raw.unit,
        referencePeriod: raw.referencePeriod,
        frequency: raw.frequency,
        geography: raw.geography,
        sourceId: source._id,
        sourceName: source.name,
        sourceUrl: raw.sourceUrl,
        releaseDate: raw.releaseDate,
        retrievedAt: now,
        isSample: Boolean(source.isSample),
      };

      const current = await EconomicIndicator.findOne({
        indicatorCode: raw.indicatorCode,
        geography: raw.geography,
        referencePeriod: raw.referencePeriod,
        isLatest: true,
      });

      if (!current) {
        const doc = await EconomicIndicator.create({ ...base, revisionStatus: raw.revisionStatus, isLatest: true });
        counts.created++;
        counts.createdIds.push(String(doc._id));
        continue;
      }

      if (sameValue(current.value, raw.value) && current.unit === raw.unit) {
        // Unchanged: only status may move on (e.g. provisional → final).
        if (current.revisionStatus !== raw.revisionStatus && raw.revisionStatus === "final") {
          current.revisionStatus = "final";
          current.retrievedAt = now;
          await current.save();
          counts.updated++;
        } else {
          counts.duplicate++;
        }
        continue;
      }

      // Revision: retire the current value, then insert the new one.
      await EconomicIndicator.updateOne({ _id: current._id }, { $set: { isLatest: false } });
      try {
        const doc = await EconomicIndicator.create({
          ...base,
          revisionStatus: raw.revisionStatus === "final" ? "final" : "revised",
          isLatest: true,
          supersedes: current._id,
          isVerified: false,
        });
        counts.updated++;
        counts.createdIds.push(String(doc._id));
      } catch (err) {
        await EconomicIndicator.updateOne({ _id: current._id }, { $set: { isLatest: true } });
        throw err;
      }
    } catch (err) {
      counts.failed++;
      counts.recordErrors.push({ externalId: key, message: (err as Error).message } satisfies RecordError);
    }
  }
  return counts;
}
