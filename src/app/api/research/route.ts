import { NextResponse } from "next/server";
import { getCorsair, tenant, RESEARCH_OPS } from "@/lib/corsair";
import { buildResearchQuery, normalizeSources, formatDigest } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const ctx = await getCorsair();
  if (!ctx) return NextResponse.json({ available: false, reason: "not_configured" });

  let query = "";
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ available: false, reason: "bad_request" }, { status: 400 });
  }
  if (!query?.trim()) {
    return NextResponse.json({ available: false, reason: "empty_query" }, { status: 400 });
  }

  const t = tenant(ctx);

  for (const op of RESEARCH_OPS) {
    try {
      const result = await t.run<unknown>(op.path, op.query(query));
      if (!result?.success) continue;
      const sources = normalizeSources(result.data);
      if (sources.length === 0) continue;

      const digest = formatDigest(sources);
      if (!digest.trim()) continue;

      return NextResponse.json({
        available: true,
        plugin: op.plugin,
        sources,
        digest,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ available: false, reason: "no_research_plugin" });
}

/** GET: quick research query builder preview (optional, for debugging). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json({ hint: "POST { query } to run research" });
  return NextResponse.json({ query: buildResearchQuery({ prompt: q, slideCount: 8, tone: "Professional", themeId: "corsair" }) });
}
