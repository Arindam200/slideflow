import "server-only";
import { createClient, CorsairApiError, type CorsairClient } from "@corsair-dev/app";

/**
 * Thin server-side wrapper around the Corsair hosted SDK.
 * See https://docs.corsair.dev/app/direct-execution
 */

export type CorsairCtx = {
  client: CorsairClient;
  instanceId: string;
  tenantId: string;
};

export function isConfigured(): boolean {
  return Boolean(
    process.env.CORSAIR_DEV_KEY?.trim() && process.env.CORSAIR_INSTANCE_ID?.trim(),
  );
}

/**
 * Public-demo guard. On a shared deploy every request runs as the single
 * configured tenant, so Drive publishing (and source import) would read/write
 * the owner's account for every visitor. Set PUBLIC_DEMO=1 there to disable
 * those flows (local PDF/PPTX export still works). Leave unset locally.
 */
export function isPublishDisabled(): boolean {
  const v = process.env.PUBLIC_DEMO?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let cached: CorsairCtx | null = null;
let inflight: Promise<CorsairCtx | null> | null = null;

/** Resolve instance + tenant ids (cached). Handles common misconfigurations. */
export async function getCorsair(): Promise<CorsairCtx | null> {
  if (!isConfigured()) return null;
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const client = createClient({ apiKey: process.env.CORSAIR_DEV_KEY!.trim() });
    const configured = process.env.CORSAIR_INSTANCE_ID!.trim();
    const instanceId = await resolveInstanceId(client, configured);
    const tenantId = await resolveTenantId(client, instanceId, configured);
    cached = { client, instanceId, tenantId };
    return cached;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function tenant(ctx: CorsairCtx) {
  return ctx.client.instance(ctx.instanceId).tenant(ctx.tenantId);
}

export function formatCorsairError(err: unknown): string {
  if (err instanceof CorsairApiError) {
    if (err.status === 401) {
      return "Invalid Corsair API key. Check CORSAIR_DEV_KEY in .env.local.";
    }
    return err.message || err.code || "Corsair API error";
  }
  if (err instanceof Error) {
    if (err.message.includes("<!DOCTYPE") || err.message.includes("Unexpected token '<'")) {
      return "Corsair returned an HTML error page, usually a wrong CORSAIR_INSTANCE_ID. Use the opaque instance id from the Corsair dashboard (not the display name or tenant id).";
    }
    return err.message;
  }
  return "Unknown Corsair error";
}

async function resolveInstanceId(client: CorsairClient, configured: string): Promise<string> {
  const { instances } = await client.instances.list();

  if (instances.length === 0) {
    throw new CorsairApiError(404, "no_instances", "No Corsair instances found. Create one at app.corsair.dev.");
  }

  const byId = instances.find((i) => i.id === configured);
  if (byId) return byId.id;

  const byName = instances.find((i) => i.name.toLowerCase() === configured.toLowerCase());
  if (byName) return byName.id;

  // Single-instance demo: auto-select so a mistaken tenant id in CORSAIR_INSTANCE_ID still works.
  if (instances.length === 1) return instances[0].id;

  const options = instances.map((i) => `${i.name} → ${i.id}`).join("; ");
  throw new CorsairApiError(
    400,
    "instance_not_found",
    `CORSAIR_INSTANCE_ID "${configured}" did not match any instance. Available: ${options}`,
  );
}

async function resolveTenantId(
  client: CorsairClient,
  instanceId: string,
  configuredInstance: string,
): Promise<string> {
  const explicit = process.env.CORSAIR_TENANT_ID?.trim();
  if (explicit) return explicit;

  const { tenants } = await client.instance(instanceId).tenants.list();

  // Common mistake: tenant id was pasted into CORSAIR_INSTANCE_ID.
  if (configuredInstance && tenants.some((t) => t.id === configuredInstance)) {
    return configuredInstance;
  }

  if (tenants.length === 1) return tenants[0].id;
  if (tenants.length > 0) return tenants[0].id;

  return "demo-user";
}

export const OPS = {
  driveUpload: "googledrive.api.files.upload",
  driveShare: "googledrive.api.files.share",
  driveGet: "googledrive.api.files.get",
  driveDownload: "googledrive.api.files.download",
} as const;

export const DRIVE_CONTENT_FIELD = "content";

export const RESEARCH_PLUGINS = ["exa", "tavily", "firecrawl"] as const;

/** Catalog paths from https://api.corsair.dev/md/integrations */
export const RESEARCH_OPS: {
  plugin: string;
  path: string;
  query: (q: string) => Record<string, unknown>;
}[] = [
  { plugin: "exa", path: "exa.api.search.search", query: (q) => ({ query: q, numResults: 6, contents: { highlights: true, text: { maxCharacters: 800 } } }) },
  { plugin: "tavily", path: "tavily.api.search.search", query: (q) => ({ query: q, max_results: 6, include_raw_content: true }) },
  { plugin: "firecrawl", path: "firecrawl.api.search.run", query: (q) => ({ query: q, limit: 6, scrapeOptions: { formats: ["markdown"] } }) },
];
