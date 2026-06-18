/** Art-direction prompt for slide background imagery. */
export function buildImagePrompt(opts: {
  title?: string;
  visual?: string;
  mood?: string;
  layout?: string;
}): string {
  const subject = opts.visual || opts.title || "an abstract concept";
  const layoutHint = layoutPromptHint(opts.layout);

  const parts = [
    `Abstract, editorial background artwork for a premium presentation slide.`,
    `Concept: ${opts.title ?? subject}.`,
    `Visual motif: ${subject}.`,
    opts.mood ? `Color and lighting mood: ${opts.mood}.` : "",
    layoutHint,
    `Style: cinematic, high-end, minimal, painterly gradients and organic forms, soft depth of field, generous negative space.`,
    `Absolutely no text, no letters, no words, no numbers, no charts, no logos, no UI elements, no people's faces.`,
  ];
  return parts.filter(Boolean).join(" ");
}

function layoutPromptHint(layout?: string): string {
  switch (layout) {
    case "cover":
    case "closing":
      return "Composition: wide cinematic horizon, bold focal energy, hero-slide atmosphere.";
    case "section":
      return "Composition: dramatic chapter divider, deep gradients, strong sense of transition.";
    case "spotlight":
      return "Composition: single striking focal object or form, portrait-friendly framing.";
    case "quote":
      return "Composition: moody, contemplative atmosphere, soft bokeh, emotional weight.";
    case "stat":
      return "Composition: abstract data-energy with flowing lines, luminous nodes, no digits or graphs.";
    case "timeline":
      return "Composition: sense of journey or progression with paths, arcs, connected light trails.";
    case "two-column":
    case "comparison":
      return "Composition: subtle dual-tone split with two complementary color fields, left/right balance.";
    case "bullets":
      return "Composition: calm, uncluttered backdrop with open space for text on the left.";
    default:
      return "";
  }
}

/** Layouts that receive Gemini-generated imagery. */
export const IMAGE_LAYOUTS = new Set([
  "cover",
  "section",
  "spotlight",
  "closing",
  "quote",
  "stat",
  "timeline",
  "bullets",
  "two-column",
  "comparison",
]);

/** How generated art is composited on each layout. */
export type ImageMode = "full-bleed" | "vignette" | "ambient" | "panel";

export function imageModeFor(layout?: string): ImageMode | null {
  if (!layout || !IMAGE_LAYOUTS.has(layout)) return null;
  switch (layout) {
    case "cover":
    case "section":
    case "closing":
      return "full-bleed";
    case "quote":
      return "vignette";
    case "spotlight":
      return "panel";
    case "bullets":
    case "stat":
    case "timeline":
    case "two-column":
    case "comparison":
      return "ambient";
    default:
      return null;
  }
}

export function aspectFor(layout?: string): "16:9" | "3:4" {
  return layout === "spotlight" ? "3:4" : "16:9";
}
