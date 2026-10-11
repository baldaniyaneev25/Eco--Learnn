# EcoLearn — Web Data Integration

EcoLearn teaches economics in Gujarati and English. This repository contains three parts:

- **Web data integration backend:** fetches approved sources, normalises the data, removes duplicates, classifies it and queues it for review.
- **Web Data Manager:** an admin panel section where staff configure sources, review imported items, verify statistics and audit changes.
- **Student modules:** Economics News, Current Affairs, Indian Economy Dashboard and Learning Resources, all served only through backend APIs.
- **Mobile app** ([`mobile/`](mobile/README.md)): an Expo (React Native) app for Android and iOS. It shows the same four modules plus a profile screen, and fetches everything from this web backend's API.

> **Scope note.** This repository began as an empty Create Next App scaffold. The EcoLearn features listed as "existing" in the spec (student accounts with progress, notes, PDFs, quizzes and mock tests, teacher dashboards) were not in it, so they were **not** recreated here.
>
> This repo adds what the new modules need:
> - a `users` collection with student, editor and admin roles
> - session auth
> - board, class and language preferences
> - an admin shell
>
> When you merge with the full EcoLearn codebase, point `lib/models/User.ts` and `lib/auth/*` at the existing account system. The new modules use only `getSessionUser` / `requireRole` from `lib/auth/guard.ts`.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, MongoDB with Mongoose 9, Zod, and Vitest.

---

## 1. Quick start

```bash
npm install
cp .env.example .env.local       # set MONGODB_URI, SESSION_SECRET, ADMIN_PASSWORD, CRON_SECRET
npm run seed:demo                # admin account + sources + labelled sample data, approved for the demo
npm run dev                      # http://localhost:3000  (staff: /admin)
npm run worker                   # optional: scheduled syncing in a second terminal
```

`npm run seed` without `--demo` only creates the admin account and the data sources.

The demo content is **clearly labelled sample data**:

- Titles carry a `[SAMPLE]` / `[નમૂનો]` prefix.
- Records are stored with `isSample: true`.
- The student UI shows a "Sample data" badge.
- Sample URLs use the reserved `.invalid` domain.

None of the sample figures are official statistics.

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | Long-running scheduler (`scripts/worker.ts`) |
| `npm run seed` / `seed:demo` | Seed admin + sources (+ demo sync/approval) |
| `npm test` | Unit + MongoDB integration tests (in-memory MongoDB) |
| `npm run typecheck` / `lint` | Type-check / ESLint |

## 2. Architecture

```
Approved source ──► Adapter (rss | worldbank | sample)
   (allowlist)          │  safeFetch: https only, allowlisted host, DNS → public IP check at connect,
                        │  redirect re-validation, 15 s timeout, size cap, no script execution
                        ▼
                 Normalise → content policy → fingerprint → de-duplicate → classify → flag
                        │                                                   │
                importedItems (reviewStatus: pending)              economicIndicators (unverified,
                        │                                           revisions kept as history)
          Web Data Manager review (approve/edit/reject/archive/rollback, translations, verify)
                        ▼
      Public APIs (approved/verified only, paginated, cached) ──► Student modules
```

Key directories:

| Path | Contents |
| --- | --- |
| `config/approved-sources.ts` | **Domain allowlist**: integration types, minimum fetch interval and maximum storage policy per domain |
| `config/categories.ts`, `config/worldbank-indicators.ts` | Topic taxonomy (EN/GU) and the approved indicator catalogue |
| `lib/security/` | URL guard, SSRF-safe fetch, IP blocklist, rate limiter |
| `lib/ingestion/` | Adapters, pipeline, indicators, sync jobs/locks/backoff, alerts, translation |
| `lib/content/` | Review state machine and public read queries |
| `lib/models/` | Mongoose models (collections below) |
| `app/api/` | Route handlers |
| `app/(student)/`, `app/admin/` | Student app and admin panel |
| `scripts/` | Worker and seed |
| `tests/` | Vitest suites |

### MongoDB collections

| Collection | Notes |
| --- | --- |
| `dataSources` | Source config, `accessReview` (terms, licence, reviewer), schedule (`nextRunAt`), health (`consecutiveFailures`, `alertActive`) and the `syncLock`. **No credentials**: `integrationConfig.apiKeyEnv` may only name an environment variable. |
| `importedItems` | Original text (limited by content policy), editor-written `publication`, `flags`, `publicationHistory` (versions for rollback). Unique indexes on `(sourceId, externalId)` and `canonicalUrl`; `contentFingerprint` is indexed. |
| `economicIndicators` | One document per published value. A revision inserts a new record and sets `isLatest: false` on the old one, using a partial unique index. |
| `translations` | Kept separate from the originals. `translationMethod` is machine, human or machine-edited; `reviewStatus` is draft, approved or rejected. |
| `syncJobs` | Every run, with fetched, created, updated, duplicate, skipped and failed counts, record errors, and whether it is retryable. |
| `contentAuditLogs` | Imports, source changes, syncs, review actions, translations, indicator verification, alerts and staff logins. |
| `users` | Student, editor and admin accounts. |

Imported content is kept apart from study notes. Nothing reaches students until an editor approves it.

## 3. Source configuration

### Initial sources (seeded)

| Source | Type | State after seed | Access method |
| --- | --- | --- | --- |
| EcoLearn Sample News / Indicators | `sample` | Enabled | Bundled data, no network |
| World Bank – India macro indicators | `worldbank` | **Disabled** | Public JSON API at `api.worldbank.org/v2`, no key. Datasets are generally CC BY 4.0. |
| RBI – Press Releases | `rss` | **Disabled** | RSS feed at `https://www.rbi.org.in/pressreleases_rss.xml` |

Both real integrations were fetched successfully through the guarded fetcher during development on 2026-10-11:

- **RBI:** 10 press releases imported.
- **World Bank:** 50 indicator values imported.

Before enabling either source in production, an admin must do three things:

1. Read the source's terms of use and licence, and confirm the attribution wording. The links are in the source card.
2. Tick **"I have reviewed this source's terms…"** in Web Data Manager → Data sources → Edit. Enabling is refused until this is ticked.
3. Enable the source.

The domain allowlist applies these limits:

| Domain | Min interval | Max stored content |
| --- | --- | --- |
| `rbi.org.in` | 60 min | Excerpt |
| `pib.gov.in` | 60 min | Excerpt |
| `api.worldbank.org` | 24 h | Full text |

MoSPI, the Ministry of Finance, NCERT and GSEB are **not** wired up yet. Their public APIs and feeds, terms and stable URLs need to be confirmed first.

### Adding a new source

1. **Check the access method.** Confirm an official API, RSS feed or open dataset exists. Check its terms, licence, rate limits and robots policy. Do not scrape pages that forbid it, and never bypass logins, paywalls or bot protection.
2. **Allowlist the domain.** Add it to `APPROVED_DOMAINS` in `config/approved-sources.ts` with its `minIntervalMinutes`, `maxContentPolicy` and notes. For RSS-only additions, `ALLOWED_SOURCE_DOMAINS` is enough.
3. **Add an adapter if needed.** A new format needs an adapter in `lib/ingestion/adapters/` implementing `SourceAdapter`, registered in `adapters/index.ts` and added to `SOURCE_TYPES`.
4. **Create the source.** In Web Data Manager, set the categories to import, the interval, the storage policy and the default student section.
5. **Store any key securely.** Put API keys in an environment variable or secrets manager. Reference it by name via `apiKeyEnv`.

**Content policies:**

| Policy | What is stored |
| --- | --- |
| `metadata-only` | Title, link and date |
| `excerpt` | Up to 400 characters |
| `full-text` | Up to 20 000 characters |

The effective policy is the stricter of the source setting and the domain maximum. Students always see an **editor-written summary** plus the source name, date and original link. Approving a summary that copies a long passage from the source is refused.

## 4. Review workflow

1. **Queue.** Imported items arrive as `pending`. The queue can be filtered by status, category, flag, language, source and search text.
2. **Flags.** Each item may carry flags:
   - `needsFactCheck`: the text contains figures. Approval requires confirming the figures were checked.
   - `needsAcademicReview`: learning resources. Approval requires confirming the academic review.
   - `needsTranslation`
   - `sourceUpdatedAfterReview`: the source changed after approval. The original is refreshed and the editor's version is kept.
3. **Approve.** Approving sets the section, title, original summary, category, class and board relevance and difficulty. The item is then published.
4. **Edit, reject, archive, roll back.** An edit creates a new version. Rejecting requires a reason. Archiving hides the item from students. Roll back restores any earlier version. Every action is written to the audit log.
5. **Translate.** Editors write or correct the other-language version.
   - With `TRANSLATION_PROVIDER=libretranslate`, machine drafts are created server-side and labelled *draft*. A warning is recorded if any numbers changed.
   - Students only see **approved** translations, labelled as an EcoLearn translation, not an official publication of the source.
6. **Verify indicators.** Indicator values stay hidden from students until an editor marks them verified. Revisions arrive unverified, and earlier values remain visible as history.

**Roles:**

- `editor`: reviews items, translations and indicators.
- `admin`: everything an editor can do, plus managing sources, syncs and retries.

## 5. Scheduling and background jobs

Route handlers are never relied on as long-running workers. Choose one or both:

- **Worker (recommended):** run `npm run worker` on a small VM or container (Railway, Render, Fly, ECS…). It ticks every `WORKER_TICK_SECONDS`.
- **Cron:** call `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.
  - `vercel.json` schedules this once a day (00:30 UTC), the most the Vercel free (Hobby) plan allows. Vercel Cron sends the header automatically when `CRON_SECRET` is set. For more frequent syncs, use the Pro plan, an external cron service calling this URL, or `npm run worker`.
  - Each call runs one bounded tick (about 45 s budget, `maxDuration = 60`).

Guarantees:

- **No concurrent duplicate syncs.** Jobs are claimed atomically, there is a per-source MongoDB lock with a TTL, and `enqueueSync` returns any existing queued or running job instead of creating another.
- **Rate limits are respected.** A source is never fetched more often than its domain's minimum interval, including manual syncs and retries; violations get HTTP 429.
- **Retries back off.**
  - Within one sync, transient errors (network, timeouts, 5xx, 429 with `Retry-After`) are retried up to 3 times with exponential backoff.
  - 4xx errors such as 401/403 are never retried.
  - Across syncs, the next scheduled run backs off: interval × 2^failures, capped at 24 h.
- **Every run is recorded** in `syncJobs`. Stale `running` jobs (for example, a killed worker) are marked failed and retryable.
- **Alerts.** After `ALERT_FAILURE_THRESHOLD` consecutive failures the source is flagged. A banner appears in the admin overview, an audit entry is written, and `ALERT_WEBHOOK_URL` is notified if set (Slack/Teams-compatible JSON `{text}`).
- **Manual sync and retry** (admin only) queue a job and process it with `after()`. If that invocation ends early, the worker or cron picks up the queued job.

## 6. API reference

All responses are JSON. Errors have the form `{ "error": string, "details"?: … }`.

### Public (students)

These endpoints return only approved or verified records. They are rate-limited to 120 requests/min/IP and send `Cache-Control: public, s-maxage=…`.

| Endpoint | Query parameters |
| --- | --- |
| `GET /api/economics-news` | `page`, `limit` (≤50), `lang=en\|gu`, `category` |
| `GET /api/economics-news/[id]` | `lang` |
| `GET /api/current-affairs` | above + `from`, `to` (YYYY-MM-DD), `class`, `board` |
| `GET /api/learning-resources` | above + `difficulty` |
| `GET /api/economic-indicators` | — (latest verified value per indicator) |
| `GET /api/economic-indicators/[code]` | — (series + superseded revisions) |

Every item includes:

- `source.name`, `source.url` (null for sample data)
- `publishedAt`
- `isSample`
- translation labels: `isTranslation`, `translationUnavailable`

Every indicator includes:

- `referencePeriod`, `unit`, `frequency`
- `revisionStatus` (provisional, estimate, revised or final)
- `source`, `releaseDate`, `lastUpdated`
- a description

The dashboard shows each indicator with its own period, and the UI warns against comparing figures from different periods or sources.

### Auth

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login` | Log in (rate-limited) |
| `POST /api/auth/logout` | Log out |
| `POST /api/auth/register` | Self-registration; always creates a student account |
| `GET /api/auth/me` | Current user |
| `PATCH /api/auth/me` | Update board, class and language preferences |
| `GET /api/meta` | Category labels (EN/GU), boards, classes and difficulty levels, for API clients such as the mobile app |

The browser uses an httpOnly session cookie. The mobile app sends `"client": "mobile"` to login or register and receives a signed `token` instead, valid for 30 days. It sends the token as `Authorization: Bearer <token>`. Both are checked by the same `getSessionUser`, which re-reads the user from the database on every request.

### Admin

Every request checks the session server-side, re-reads the user's role from the database, and rejects mutating requests whose `Origin` does not match the host.

| Endpoint | Role |
| --- | --- |
| `GET /api/admin/data-sources`, `POST /api/admin/data-sources` | GET: staff · POST: admin |
| `PATCH /api/admin/data-sources/[id]` (also `GET`) | admin |
| `POST /api/admin/data-sources/[id]/sync` | admin |
| `GET /api/admin/imported-items` (`status`, `sourceId`, `category`, `section`, `lang`, `flag`, `q`, `page`, `limit`) | staff |
| `GET /api/admin/imported-items/[id]` (detail, provenance, translations, audit) | staff |
| `PATCH /api/admin/imported-items/[id]/review` (`action`: approve, edit, reject, archive, rollback) | staff |
| `PUT /api/admin/imported-items/[id]/translations` | staff |
| `GET /api/admin/sync-jobs` (`sourceId`, `status`) | staff |
| `POST /api/admin/sync-jobs/[id]/retry` | admin |
| `GET /api/admin/content-audit-logs` (`entityId`, `action`, `actor`) | staff |
| `GET /api/admin/economic-indicators`, `PATCH /api/admin/economic-indicators/[id]` | staff |
| `GET /api/admin/overview` | staff |
| `GET /api/cron/sync` | `CRON_SECRET` |

## 7. Security and data quality

**Fetching (SSRF and untrusted content):**

- Fetches use an allowlist of domains and integration types. Admins cannot add arbitrary hosts.
- **SSRF protection:**
  - URLs must be https on the default port, with no embedded credentials, no IP literals and no internal host names.
  - Each DNS answer is checked against private, loopback, link-local and metadata ranges (169.254.169.254, `fd00:ec2::254`), CGNAT, multicast, and IPv4-mapped/NAT64 forms. The check runs inside the socket `lookup`, which defeats DNS rebinding.
  - Every redirect is re-validated, and at most 3 redirects are followed.
- **Limits:** 15 s timeout, response size caps checked after decompression, and content-type checks.
- **Parsing:**
  - Feeds containing `DOCTYPE`/`ENTITY` are refused, which blocks XXE and entity-expansion attacks.
  - HTML is reduced to plain text; scripts and styles are dropped.
  - Imported text is only ever rendered as React text (never `dangerouslySetInnerHTML`) and is never interpreted as instructions or configuration.
- **Validation:** item links must point back to an approved domain.

**Accounts and secrets:**

- Passwords are hashed with scrypt.
- Session cookies are HMAC-signed, httpOnly and SameSite=Lax, and Secure in production.
- An `Origin` check is applied to admin mutations.
- `proxy.ts` only does an optimistic redirect; the APIs are the real authorization.
- Secrets live in environment variables only, and `integrationConfig` is a strict schema that rejects unknown keys.

**Rate limiting:** applies to public, login and registration endpoints. It runs in memory, so put a shared limiter or WAF in front when running more than one instance.

**Audit, freshness and attribution:**

- An audit trail and versioned rollback are kept for published content.
- The admin panel shows source freshness (fresh, stale or never), plus failure and duplicate rates over recent syncs.
- The student pages show source attribution and dates.

## 8. Testing

```bash
npm test
```

There are 81 tests in 6 suites. They run in about 3 s once the in-memory MongoDB binary has been downloaded on the first run.

| Area | Covers |
| --- | --- |
| Security | IP blocklist, URL guard, SSRF lookup, rate limit |
| Text processing | HTML→text sanitising, canonical URLs, fingerprints, language detection, classifier, number preservation, copy detection |
| Adapters | RSS/Atom parsing incl. XXE refusal, World Bank parsing |
| Auth & sync helpers | Sessions, passwords, backoff, retry |
| Source config validation | Allowlist, intervals, terms gate, partial-update safety |
| **Integration (MongoDB)** | Imports, de-duplication, interval floor, category filter, content policy, source-update detection, partial failures, backoff and alerts, concurrency lock, scheduler, indicator revision history, review workflow, translations, rollback, archive, class filters |

## 9. Deployment

1. **Database.** Use MongoDB Atlas (or self-hosted) and set `MONGODB_URI`. The unique indexes are created by `npm run seed` (`syncIndexes`) and by Mongoose autoIndex.
2. **Web app.** Deploy to Vercel or any Node 20.9+ host with `npm run build && npm start`. Set every variable from `.env.example`. Use a long random `SESSION_SECRET` and `CRON_SECRET`.
3. **Scheduler.** Either keep `vercel.json` crons (Vercel), or run `npm run worker` as a separate always-on process with the same environment.
4. **First run.** Run `npm run seed` once against production with `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Then sign in at `/admin`, complete the terms review for the real sources and enable them. Delete or disable the sample sources and archive the sample items before launch.
5. **Optional extras:**
   - Set `ALERT_WEBHOOK_URL` for failure alerts.
   - Set `TRANSLATION_PROVIDER=libretranslate` plus `TRANSLATION_API_URL`/`TRANSLATION_API_KEY` for machine drafts.
   - Put a CDN or WAF in front for caching and shared rate limiting.
