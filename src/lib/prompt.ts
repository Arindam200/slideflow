import type { GenerateRequest } from "./deck";
import { LAYOUTS } from "./deck";
import { getTheme } from "./themes";

export function buildSystemPrompt() {
  return `You are the lead content designer at a top-tier presentation studio. You craft decks that look designed, not like documents pasted onto slides. A clear narrative arc, ruthless concision, and visual rhythm.

DESIGN PHILOSOPHY: slides are visual, not essays:
- Less text beats more text. White space is a feature. One idea per slide.
- NEVER use "bullets" on more than ~40% of content slides. Mix layouts so the deck breathes.
- Do NOT use the same layout on consecutive slides.
- Prefer impact layouts (stat, quote, section, spotlight) over dense bullet lists.
- On bullet slides: 3 bullets max (4 only if essential). Skip "detail" on most bullets; use it on at most one bullet per slide.
- On two-column / comparison: 2-3 short bullets per column, not paragraphs.
- On stat slides: 1 big number is often enough; 2-3 max. No bullets on stat slides.
- On spotlight slides: one headline + 2 short sentences in body, not a wall of text.
- On section slides: title + one punchy line in body (under 20 words) to introduce the next act.
- On timeline slides: 3-4 steps with title (3-5 words) + description (one short line each).
- On quote slides: one memorable line + attribution. Nothing else.

Hard content rules:
- Titles are headlines, not labels. Prefer "Revenue tripled in 18 months" over "Revenue".
- Bullets are short (max ~10 words), parallel in structure, never full sentences or paragraphs.
- Use concrete specifics (numbers, names, dates). When RESEARCH is provided, prefer those facts.
- Speaker notes ("notes") are ONLY what the presenter says aloud; never put slide-visible content there.

Every slide MUST populate its layout fields (never leave them empty), but respect each layout's density:
- cover / closing: title + subtitle (subtitle = one line, under 12 words).
- section: title + body (one line, under 20 words).
- spotlight: title + body (2 sentences max, under 45 words total).
- bullets: title + 3-4 bullets (text only; detail optional on ONE bullet).
- two-column / comparison: title + exactly 2 columns (heading + 2-3 bullets each).
- stat: title + 1-3 stats (big number + short label).
- quote: quote (one line) + attribution.
- timeline: title + 3-4 steps.

Available layouts: ${LAYOUTS.join(", ")}.

Always set a short "visual" motif (2-5 words describing mood, not a photo) on every slide.`;
}

/** Suggest a layout arc so the model doesn't default to all-bullets decks. */
function layoutBlueprint(slideCount: number): string {
  if (slideCount <= 4) {
    return "Suggested arc: cover → stat or spotlight (one key fact) → bullets (3 max) → closing.";
  }
  if (slideCount <= 6) {
    return "Suggested arc: cover → section → stat → bullets (3 max) → two-column or comparison → closing.";
  }
  if (slideCount <= 10) {
    return (
      "Suggested arc: cover → section → stat → bullets (3 max) → two-column → " +
      "spotlight or quote → stat or timeline → section → closing. Use at most 2 bullet slides total."
    );
  }
  return (
    "Suggested arc: cover → section → mix stat / spotlight / two-column / timeline / quote across the middle " +
    "(no more than 3 bullet slides in the whole deck) → section dividers between acts → closing."
  );
}

export function buildUserPrompt(
  req: GenerateRequest,
  research?: string,
  meta?: { plugin?: string; sourceCount?: number },
  source?: { title?: string; text: string },
) {
  const theme = getTheme(req.themeId);
  const contentSlides = Math.max(1, req.slideCount - 2);
  const maxBulletSlides = Math.max(1, Math.ceil(contentSlides * 0.4));

  const lines: string[] = [];
  lines.push(`Create a ${req.slideCount}-slide presentation.`);
  lines.push(``);
  lines.push(`TOPIC / BRIEF:\n${req.prompt}`);
  if (req.audience?.trim()) {
    lines.push(``);
    lines.push(`AUDIENCE: ${req.audience.trim()}`);
  }
  lines.push(``);
  lines.push(`TONE: ${req.tone}. Match this voice throughout.`);
  lines.push(
    `DESIGN CONTEXT: the deck uses the "${theme.name}" theme (${theme.mood}). Keep "visual" motifs consistent with this mood.`,
  );
  lines.push(``);
  lines.push(`Produce exactly ${req.slideCount} slides: cover first, closing last.`);
  lines.push(layoutBlueprint(req.slideCount));
  lines.push(``);
  lines.push(`FORMATTING CHECKLIST:`);
  lines.push(`- Use at most ${maxBulletSlides} "bullets" layout slide(s) in the entire deck.`);
  lines.push(`- Include at least one "stat" slide with a bold number from the narrative.`);
  lines.push(`- Include at least one "section" divider if the deck has 5+ slides.`);
  lines.push(`- No slide should feel crowded; if content doesn't fit cleanly, split it across two slides with different layouts.`);
  lines.push(`- Populate the correct layout fields; do NOT put visible copy in "notes".`);

  if (source?.text.trim()) {
    lines.push(``);
    lines.push(
      `SOURCE DOCUMENT${source.title ? ` ("${source.title}")` : ""} — the user's own material, imported via Google Drive. Build the deck primarily from this content: preserve its facts, structure, and terminology, and turn it into a clear narrative. The brief above sets framing; this document is the substance.`,
    );
    lines.push(source.text.trim());
  }

  if (research?.trim()) {
    lines.push(``);
    lines.push(
      `RESEARCH (${meta?.sourceCount ?? "several"} live sources${meta?.plugin ? ` via ${meta.plugin}` : ""}; distribute facts across stat, bullets, and spotlight slides; do not dump everything on one slide):`,
    );
    lines.push(research.trim());
    lines.push(``);
    lines.push(
      `From the research: place specific numbers on "stat" slides, contrasts on "two-column"/"comparison", and process/history on "timeline". Spread facts across the deck.`,
    );
  }

  return lines.join("\n");
}
