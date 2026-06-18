import { NextResponse } from "next/server";
import {
  getCorsair,
  scopedTenant,
  ensureTenant,
  isDriveConnected,
  formatCorsairError,
  isPublishDisabled,
} from "@/lib/corsair";
import { readVisitorTenantId, newVisitorTenantId, setVisitorCookie } from "@/lib/visitor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await getCorsair();
  if (!ctx) {
    return NextResponse.json({ configured: false, plugins: [] as string[], error: null });
  }

  let plugins: string[] = [];
  let instanceName: string | undefined;
  let error: string | null = null;

  try {
    const detail = await ctx.client.instance(ctx.instanceId).get();
    instanceName = detail.name;
    plugins = (detail.plugins ?? []).map((p) => p.id).filter(Boolean);
  } catch (e) {
    error = formatCorsairError(e);
  }

  const has = (...ids: string[]) => ids.some((id) => plugins.includes(id));
  const publishDisabled = isPublishDisabled();
  const driveInstalled = !publishDisabled && has("googledrive");

  // Resolve (or mint) this visitor's own tenant, so Drive runs as them.
  let tenantId = readVisitorTenantId(req);
  let mintedCookie = false;
  if (!tenantId) {
    tenantId = newVisitorTenantId();
    mintedCookie = true;
  }
  if (driveInstalled) {
    await ensureTenant(ctx, tenantId);
  }

  // Per-visitor Drive connection state + a self-service connect link.
  let driveConnected = false;
  let connectUrl: string | undefined;
  if (driveInstalled) {
    driveConnected = await isDriveConnected(ctx, tenantId);
    const wantLink = new URL(req.url).searchParams.get("connect") === "1";
    if (wantLink && !driveConnected) {
      try {
        const link = await scopedTenant(ctx, tenantId).connectLink.create({ plugins: ["googledrive"] });
        connectUrl = link.url;
      } catch (e) {
        error ??= formatCorsairError(e);
      }
    }
  }

  const res = NextResponse.json({
    configured: true,
    instanceId: ctx.instanceId,
    instanceName,
    tenantId,
    plugins,
    publishDisabled,
    driveConnected,
    capabilities: {
      research: has("exa", "tavily", "firecrawl"),
      driveInstalled,
    },
    connectUrl,
    error,
  });
  if (mintedCookie) setVisitorCookie(res, tenantId);
  return res;
}
