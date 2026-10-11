// Central access to environment configuration. Secrets are read only on the
// server (route handlers, worker, scripts) and never exposed to the client.

function read(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export const env = {
  get mongodbUri(): string {
    const uri = read("MONGODB_URI");
    if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
    return uri;
  },
  get sessionSecret(): string {
    const secret = read("SESSION_SECRET");
    if (!secret || secret.length < 32) {
      throw new Error("SESSION_SECRET must be set to at least 32 characters.");
    }
    return secret;
  },
  get cronSecret(): string | undefined {
    return read("CRON_SECRET");
  },
  /** Extra approved domains (comma separated) on top of config/approved-sources.ts. */
  get extraAllowedDomains(): string[] {
    return (read("ALLOWED_SOURCE_DOMAINS") ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  },
  get alertWebhookUrl(): string | undefined {
    return read("ALERT_WEBHOOK_URL");
  },
  get alertFailureThreshold(): number {
    return Number(read("ALERT_FAILURE_THRESHOLD", "3"));
  },
  get translationProvider(): "none" | "libretranslate" {
    return read("TRANSLATION_PROVIDER", "none") === "libretranslate" ? "libretranslate" : "none";
  },
  get translationApiUrl(): string | undefined {
    return read("TRANSLATION_API_URL");
  },
  get translationApiKey(): string | undefined {
    return read("TRANSLATION_API_KEY");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
