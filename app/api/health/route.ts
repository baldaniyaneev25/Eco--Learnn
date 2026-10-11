import { connection } from "next/server";
import { connectDB } from "@/lib/db";

// Deployment self-check: reports whether required settings are present and
// whether MongoDB is reachable. Never returns secret values or raw errors.

function checkMongoUri(value: string | undefined) {
  if (!value) return "missing";
  if (/^["']|["']$/.test(value)) return "invalid: remove the quote marks";
  if (!/^mongodb(\+srv)?:\/\//.test(value)) return "invalid: must start with mongodb+srv:// or mongodb://";
  if (/127\.0\.0\.1|localhost/.test(value)) return "invalid: points to localhost, use your Atlas URI";
  return "ok";
}

function checkSecret(value: string | undefined) {
  if (!value) return "missing";
  if (value.length < 32) return "too short (needs 32+ characters)";
  return "ok";
}

function classifyDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/bad auth|authentication failed/i.test(msg)) return "authentication failed: wrong username or password in MONGODB_URI";
  if (/whitelist|not allowed|IP that isn't/i.test(msg)) return "blocked: allow 0.0.0.0/0 in Atlas Network Access";
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(msg)) return "host not found: check the cluster address in MONGODB_URI";
  if (/timed out|Server selection/i.test(msg)) return "timeout: usually Atlas Network Access does not allow 0.0.0.0/0";
  if (/Invalid scheme|URI|parse/i.test(msg)) return "invalid MONGODB_URI format";
  return "connection failed";
}

export async function GET() {
  await connection();
  const settings = {
    MONGODB_URI: checkMongoUri(process.env.MONGODB_URI),
    SESSION_SECRET: checkSecret(process.env.SESSION_SECRET),
    CRON_SECRET: checkSecret(process.env.CRON_SECRET),
  };

  let database = "skipped (fix MONGODB_URI first)";
  if (settings.MONGODB_URI === "ok") {
    try {
      await connectDB();
      database = "connected";
    } catch (err) {
      database = classifyDbError(err);
    }
  }

  const ok = Object.values(settings).every((v) => v === "ok") && database === "connected";
  return Response.json(
    { ok, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, settings, database },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
