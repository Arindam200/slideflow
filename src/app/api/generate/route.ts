import { streamObject } from "ai";
import { DeckSchema, type GenerateRequest, TONES } from "@/lib/deck";
import { getModel } from "@/lib/ai";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { THEMES } from "@/lib/themes";
import { isConfigured, isPublishDisabled } from "@/lib/corsair";
import { gatherResearch } from "@/lib/research";
import { gatherSource } from "@/lib/source";
import { readVisitorTenantId } from "@/lib/visitor";

export const runtime = "nodejs";
export const maxDuration = 60;

function sanitize(raw: unknown): GenerateRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
  if (!prompt) return null;

  const slideCount = Math.min(
    20,
    Math.max(3, Math.round(Number(r.slideCount) || 8)),
  );
  const tone = (TONES as readonly string[]).includes(r.tone as string)
    ? (r.tone as GenerateRequest["tone"])
    : "Professional";
  const themeId = THEMES.some((t) => t.id === r.themeId)
    ? (r.themeId as string)
    : THEMES[0].id;

  return {
    prompt: prompt.slice(0, 4000),
    slideCount,
    tone,
    themeId,
    audience: typeof r.audience === "string" ? r.audience.slice(0, 300) : undefined,
    research: Boolean(r.research),
    sourceUrl: typeof r.sourceUrl === "string" && r.sourceUrl.trim() ? r.sourceUrl.trim().slice(0, 600) : undefined,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const reqData = sanitize(body);
  if (!reqData) {
    return Response.json({ error: "A presentation brief is required." }, { status: 400 });
  }

  // Ground the deck in the user's own document, imported via Corsair (Google Drive).
  // Disabled on the public demo, where every request shares one tenant — we won't
  // read the owner's private Drive on behalf of anonymous visitors.
  let source: { title?: string; text: string } | undefined;
  const visitorTenantId = readVisitorTenantId(req);
  if (reqData.sourceUrl && visitorTenantId && !isPublishDisabled()) {
    try {
      const s = await gatherSource(reqData.sourceUrl, visitorTenantId);
      if (s.available && s.text) source = { title: s.title, text: s.text };
      else console.warn("[generate] source import skipped:", s.reason);
    } catch (e) {
      console.warn("[generate] source import failed", e);
    }
  }

  // Ground the deck in live facts via Corsair when research is on or Corsair is configured.
  let research: string | undefined;
  let researchMeta: { plugin?: string; sourceCount?: number } | undefined;
  const shouldResearch = reqData.research || isConfigured();
  if (shouldResearch) {
    try {
      const result = await gatherResearch(reqData);
      if (result.available && result.digest) {
        research = result.digest;
        researchMeta = { plugin: result.plugin, sourceCount: result.sources?.length };
      }
    } catch (e) {
      console.warn("[generate] research failed", e);
    }
  }

  let model;
  try {
    model = getModel();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const result = streamObject({
    model,
    schema: DeckSchema,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(reqData, research, researchMeta, source),
    temperature: 0.8,
    abortSignal: req.signal,
    onError: (e) => console.error("[generate] stream error", e),
  });

  return result.toTextStreamResponse();
}
