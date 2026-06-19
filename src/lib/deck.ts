import { z } from "zod";

/**
 * The deck schema is intentionally "wide and optional": every layout reads from
 * the same flat slide object. This keeps `streamObject` partial-parsing robust
 * (discriminated unions break badly while a slide is half-streamed) and lets the
 * renderer degrade gracefully when a field hasn't arrived yet.
 */

export const LAYOUTS = [
  "cover",
  "section",
  "bullets",
  "two-column",
  "stat",
  "quote",
  "timeline",
  "comparison",
  "spotlight",
  "closing",
] as const;

export type Layout = (typeof LAYOUTS)[number];

export const BulletSchema = z.object({
  text: z.string().describe("Short, punchy bullet (max ~10 words). One line only."),
  detail: z
    .string()
    .optional()
    .describe("Optional one-line elaboration; use sparingly, on at most one bullet per slide."),
});

export const ColumnSchema = z.object({
  heading: z.string().describe("Column heading (1-4 words)."),
  bullets: z.array(z.string()).describe("2-3 short bullets per column (max ~8 words each)."),
});

export const StatSchema = z.object({
  value: z.string().describe("The headline figure, e.g. '92%', '3.4x', '$1.2B'."),
  label: z.string().describe("What the figure measures (max ~8 words)."),
});

export const StepSchema = z.object({
  title: z.string().describe("Step / milestone name."),
  description: z.string().describe("One line describing the step."),
});

export const SlideSchema = z.object({
  layout: z
    .enum(LAYOUTS)
    .describe(
      "Visual template. Vary layouts; avoid using 'bullets' on every slide. Prefer stat, section, spotlight, two-column, quote, timeline for rhythm.",
    ),
  title: z.string().describe("The slide's headline."),
  subtitle: z
    .string()
    .optional()
    .describe("Supporting line under the title, used by cover/section/closing."),
  body: z
    .string()
    .optional()
    .describe("Short paragraph for spotlight (2 sentences max) or section (one line max). Keep under 45 words."),
  bullets: z.array(BulletSchema).optional().describe("For 'bullets' layout only: 3-4 items max."),
  columns: z
    .array(ColumnSchema)
    .optional()
    .describe("Exactly two columns for the 'two-column' / 'comparison' layout."),
  stats: z
    .array(StatSchema)
    .optional()
    .describe("For 'stat' layout: 1-3 big figures. One stat is often enough."),
  steps: z
    .array(StepSchema)
    .optional()
    .describe("For 'timeline' layout: 3-4 steps with short title + one-line description."),
  quote: z.string().optional().describe("The quotation text for the 'quote' layout."),
  attribution: z.string().optional().describe("Who said the quote."),
  visual: z
    .string()
    .optional()
    .describe(
      "A 2-5 word motif describing the slide's mood (e.g. 'rising momentum', 'deep ocean'). Drives the generated background art, NOT a stock photo query.",
    ),
  notes: z
    .string()
    .optional()
    .describe(
      "Speaker notes ONLY: what the presenter says aloud. Never put slide-visible bullets, body, or stats here; those belong in bullets/body/columns/stats/steps/quote.",
    ),
});

export const DeckSchema = z.object({
  title: z.string().describe("The presentation title."),
  subtitle: z.string().optional().describe("A one-line tagline for the deck."),
  slides: z.array(SlideSchema).describe("The ordered slides."),
});

export type Bullet = z.infer<typeof BulletSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type Stat = z.infer<typeof StatSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Slide = z.infer<typeof SlideSchema>;
export type Deck = z.infer<typeof DeckSchema>;

/** Partial variants for streaming; every field may be absent mid-stream. */
export type PartialSlide = Partial<Slide>;
export type PartialDeck = {
  title?: string;
  subtitle?: string;
  slides?: (PartialSlide | undefined)[];
};

export const TONES = [
  "Professional",
  "Visionary",
  "Playful",
  "Academic",
  "Bold",
] as const;
export type Tone = (typeof TONES)[number];

export type GenerateRequest = {
  prompt: string;
  slideCount: number;
  tone: Tone;
  themeId: string;
  audience?: string;
  research?: boolean;
  /** Optional Google Drive/Docs URL (or file id) to ground the deck in, via Corsair. */
  sourceUrl?: string;
};

/** Fill layout-specific fields when the model omits them (common mid-stream). */
export function normalizeSlide(slide: PartialSlide): PartialSlide {
  const layout = slide.layout ?? "bullets";
  let next = slide;

  if ((layout === "two-column" || layout === "comparison") && !hasColumns(next.columns)) {
    if (next.bullets?.length) {
      const mid = Math.ceil(next.bullets.length / 2);
      const left = next.bullets.slice(0, mid);
      const right = next.bullets.slice(mid);
      next = {
        ...next,
        columns: [
          {
            heading: layout === "comparison" ? "Before" : "Left",
            bullets: left.map((b) => b.text).filter(Boolean),
          },
          {
            heading: layout === "comparison" ? "After" : "Right",
            bullets: (right.length ? right : left).map((b) => b.text).filter(Boolean),
          },
        ],
      };
    } else if (next.body?.trim()) {
      const parts = next.body.split(/[.;]\s+/).filter(Boolean);
      next = {
        ...next,
        columns: [
          { heading: "Before", bullets: parts.slice(0, Math.ceil(parts.length / 2)) },
          { heading: "After", bullets: parts.slice(Math.ceil(parts.length / 2)) },
        ],
      };
    }
  }

  if (layout === "stat" && !next.stats?.length && next.bullets?.length) {
    next = {
      ...next,
      stats: next.bullets.slice(0, 3).map((b) => ({
        value: b.text.split(/\s+/).slice(0, 2).join(" ") || "-",
        label: b.detail ?? b.text,
      })),
    };
  }

  if (layout === "timeline" && !next.steps?.length && next.bullets?.length) {
    next = {
      ...next,
      steps: next.bullets.slice(0, 4).map((b) => ({
        title: b.text,
        description: b.detail ?? "",
      })),
    };
  }

  if (layout === "quote" && !next.quote?.trim() && next.body?.trim()) {
    next = { ...next, quote: next.body };
  }

  if (layout === "bullets" && !next.bullets?.length && next.body?.trim()) {
    next = {
      ...next,
      bullets: next.body.split(/[.;]\s+/).filter(Boolean).slice(0, 4).map((text) => ({ text })),
    };
  }

  const coalesced = coalesceBullets(next.bullets);
  if (coalesced?.length && coalesced !== next.bullets) {
    next = { ...next, bullets: coalesced };
  }

  next = hydrateFromNotes(next);

  return next;
}

/** When models stash visible copy in speaker notes, promote it to the right layout fields. */
function hydrateFromNotes(slide: PartialSlide): PartialSlide {
  const notes = slide.notes?.trim();
  if (!notes || hasVisibleContent(slide)) return slide;

  const layout = slide.layout ?? "bullets";
  const clauses = splitIntoClauses(notes);

  switch (layout) {
    case "bullets":
      return {
        ...slide,
        bullets: clauses.slice(0, 4).map((text) => ({ text: trimClause(text) })),
      };
    case "section":
    case "spotlight":
      return { ...slide, body: notes };
    case "stat": {
      const stats = extractStatsFromText(notes);
      if (stats.length) return { ...slide, stats };
      return {
        ...slide,
        stats: clauses.slice(0, 3).map((c) => ({
          value: c.split(/\s+/).slice(0, 2).join(" ") || "-",
          label: trimClause(c),
        })),
      };
    }
    case "timeline":
      return {
        ...slide,
        steps: clauses.slice(0, 4).map((c) => ({
          title: trimClause(c).split(/[-]/)[0]?.trim() || trimClause(c).slice(0, 40),
          description: trimClause(c),
        })),
      };
    case "quote":
      return { ...slide, quote: notes.split(/[.!?]/)[0]?.trim() || notes.slice(0, 200) };
    case "two-column":
    case "comparison": {
      const mid = Math.ceil(clauses.length / 2);
      return {
        ...slide,
        columns: [
          { heading: layout === "comparison" ? "Before" : "Option A", bullets: clauses.slice(0, mid).map(trimClause) },
          { heading: layout === "comparison" ? "After" : "Option B", bullets: clauses.slice(mid).map(trimClause) },
        ],
      };
    }
    case "cover":
    case "closing":
      return { ...slide, subtitle: clauses[0] ? trimClause(clauses[0]) : notes.slice(0, 120) };
    default:
      return slide;
  }
}

function hasVisibleContent(slide: PartialSlide): boolean {
  const layout = slide.layout ?? "bullets";
  if (slide.bullets?.some((b) => b?.text?.trim())) return true;
  if (slide.body?.trim()) return true;
  if (hasColumns(slide.columns)) return true;
  if (slide.stats?.some((s) => s?.value?.trim())) return true;
  if (slide.steps?.some((s) => s?.title?.trim())) return true;
  if (slide.quote?.trim()) return true;
  if ((layout === "cover" || layout === "closing") && slide.subtitle?.trim()) return true;
  return false;
}

function splitIntoClauses(text: string): string[] {
  return text
    .split(/,\s+(?=[A-Za-z$"\d(])|;\s+|(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^and\s+/i, ""))
    .filter((s) => s.length > 12);
}

function trimClause(s: string): string {
  return s.replace(/\.$/, "").trim();
}

function extractStatsFromText(text: string): { value: string; label: string }[] {
  const matches = [...text.matchAll(/(\$[\d,.]+[BMK]?|\d[\d,.]*%|\d[\d,.]*x|\d[\d,.]+\+?)\s+([^,.;]+)/gi)];
  return matches.slice(0, 3).map((m) => ({ value: m[1], label: m[2].trim() }));
}

function hasColumns(cols: PartialSlide["columns"]): boolean {
  if (!cols?.length) return false;
  return cols.some((c) => c?.heading?.trim() || c?.bullets?.some((b) => b?.trim()));
}

/** Coalesce bullet rows so empty `text` fields still render content. */
function coalesceBullets(bullets?: PartialSlide["bullets"]) {
  if (!bullets?.length) return bullets;
  return bullets
    .map((b) => ({
      text: (b?.text?.trim() || b?.detail?.trim() || "") as string,
      detail: b?.detail?.trim() && b.detail !== b?.text ? b.detail : undefined,
    }))
    .filter((b) => b.text);
}

/** Deep-merge streamed deck updates so partial JSON never wipes nested slide fields. */
export function mergeSlide(prev?: PartialSlide, next?: PartialSlide): PartialSlide | undefined {
  if (!next) return prev;
  if (!prev) return next;
  const bullets = mergeBullets(prev.bullets, next.bullets);
  return {
    ...prev,
    ...next,
    bullets: bullets?.length ? bullets : prev.bullets ?? next.bullets,
    columns: next.columns?.length ? next.columns : prev.columns,
    stats: next.stats?.length ? next.stats : prev.stats,
    steps: next.steps?.length ? next.steps : prev.steps,
  };
}

function mergeBullets(
  prev?: PartialSlide["bullets"],
  next?: PartialSlide["bullets"],
): PartialSlide["bullets"] {
  if (!next?.length) return prev;
  if (!prev?.length) return next;
  const len = Math.max(prev.length, next.length);
  return Array.from({ length: len }, (_, i) => ({
    ...prev[i],
    ...next[i],
    text: next[i]?.text?.trim() ? next[i]!.text : prev[i]?.text,
    detail: next[i]?.detail ?? prev[i]?.detail,
  }));
}

export function mergeDeck(prev: PartialDeck, next: PartialDeck): PartialDeck {
  const prevSlides = prev.slides ?? [];
  const nextSlides = next.slides ?? [];
  const len = Math.max(prevSlides.length, nextSlides.length);
  const slides = len
    ? Array.from({ length: len }, (_, i) => mergeSlide(prevSlides[i], nextSlides[i]))
    : undefined;
  return {
    title: next.title ?? prev.title,
    subtitle: next.subtitle ?? prev.subtitle,
    slides,
  };
}

/** Normalize every slide for render/export. */
export function normalizeDeck(deck: PartialDeck): PartialDeck {
  return {
    ...deck,
    slides: deck.slides?.map((s) => (s ? normalizeSlide(coalesceSlide(s)) : s)),
  };
}

function coalesceSlide(slide: PartialSlide): PartialSlide {
  const bullets = coalesceBullets(slide.bullets);
  return bullets?.length ? { ...slide, bullets } : slide;
}

/** Slides ready for export; must have a title. */
export function toExportSlides(slides: PartialSlide[]): Slide[] {
  return slides
    .filter((s) => s.title?.trim())
    .map((s) => normalizeSlide(coalesceSlide(s)) as Slide);
}
