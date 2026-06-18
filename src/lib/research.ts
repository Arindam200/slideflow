import "server-only";
import { getCorsair, tenant, RESEARCH_OPS } from "@/lib/corsair";
import type { GenerateRequest } from "@/lib/deck";

export type ResearchSource = { title?: string; url?: string; snippet?: string };

export type ResearchResult = {
  available: boolean;
  plugin?: string;
  sources?: ResearchSource[];
  digest?: string;
  reason?: string;
};

/** Build a search query tuned for deck grounding. */
export function buildResearchQuery(req: GenerateRequest): string {
  const parts = [req.prompt.trim()];
  if (req.audience?.trim()) parts.push(`audience: ${req.audience.trim()}`);
  parts.push(`${req.slideCount}-slide ${req.tone.toLowerCase()} presentation`);
  parts.push("key facts figures dates names metrics");
  return parts.join(" · ").slice(0, 400);
}

/** Pull live facts via Corsair research plugins. */
export async function gatherResearch(req: GenerateRequest): Promise<ResearchResult> {
  const ctx = await getCorsair();
  if (!ctx) return { available: false, reason: "not_configured" };

  const query = buildResearchQuery(req);
  const t = tenant(ctx);

  for (const op of RESEARCH_OPS) {
    try {
      const result = await t.run<unknown>(op.path, op.query(query));
      if (!result?.success) continue;
      const sources = normalizeSources(result.data);
      if (sources.length === 0) continue;

      const digest = formatDigest(sources);
      if (!digest.trim()) continue;

      return { available: true, plugin: op.plugin, sources, digest };
    } catch {
      continue;
    }
  }

  return { available: false, reason: "no_research_plugin" };
}

export function formatDigest(sources: ResearchSource[]): string {
  return sources
    .map((s, i) => {
      const head = `[${i + 1}] ${s.title ?? "Untitled"}${s.url ? ` (${s.url})` : ""}`;
      return s.snippet?.trim() ? `${head}\n${s.snippet.trim()}` : head;
    })
    .join("\n\n");
}

export function normalizeSources(data: unknown): ResearchSource[] {
  const arr = extractResultArray(data);
  return arr
    .slice(0, 8)
    .map((r) => ({
      title: pickStr(r, ["title", "name", "pageTitle"]),
      url: pickStr(r, ["url", "link", "id", "sourceURL"]),
      snippet: extractSnippet(r),
    }))
    .filter((s) => s.title || s.snippet);
}

function extractResultArray(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];

  if (typeof data !== "object") return [];
  const d = data as Record<string, unknown>;

  for (const key of ["results", "data", "items", "organic", "documents"]) {
    if (Array.isArray(d[key])) return d[key] as Record<string, unknown>[];
  }

  // Corsair / provider wrappers: { data: { results: [...] } }
  if (d.data && typeof d.data === "object") {
    return extractResultArray(d.data);
  }

  return [];
}

function extractSnippet(item: Record<string, unknown>): string | undefined {
  const direct =
    pickStr(item, ["text", "snippet", "content", "description", "summary", "markdown", "raw_content"]) ??
    pickStr(item, ["highlight", "excerpt"]);

  if (direct) return direct.slice(0, 900);

  const highlights = item.highlights;
  if (Array.isArray(highlights) && highlights.length) {
    const joined = highlights
      .map((h) => (typeof h === "string" ? h : pickStr(h as Record<string, unknown>, ["text", "snippet"])))
      .filter(Boolean)
      .join(" ");
    if (joined) return joined.slice(0, 900);
  }

  if (item.contents && typeof item.contents === "object") {
    const fromContents = extractSnippet(item.contents as Record<string, unknown>);
    if (fromContents) return fromContents;
  }

  return undefined;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
