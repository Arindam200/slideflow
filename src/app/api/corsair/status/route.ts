import { NextResponse } from "next/server";
import { getCorsair, tenant, formatCorsairError, isPublishDisabled } from "@/lib/corsair";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await getCorsair();
  if (!ctx) {
    return NextResponse.json({ configured: false, plugins: [] as string[], error: null });
  }

  let plugins: string[] = [];
  let instanceName: string | undefined;
  let tenantId = ctx.tenantId;
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

  const wantLink = new URL(req.url).searchParams.get("connect") === "1";
  let connectUrl: string | undefined;
  if (wantLink && !publishDisabled) {
    try {
      const link = await tenant(ctx).connectLink.create();
      connectUrl = link.url;
    } catch (e) {
      error ??= formatCorsairError(e);
    }
  }

  return NextResponse.json({
    configured: true,
    instanceId: ctx.instanceId,
    instanceName,
    tenantId,
    plugins,
    publishDisabled,
    capabilities: {
      research: has("exa", "tavily", "firecrawl"),
      drive: publishDisabled ? false : has("googledrive"),
      slack: publishDisabled ? false : has("slack"),
    },
    connectUrl,
    error,
  });
}
