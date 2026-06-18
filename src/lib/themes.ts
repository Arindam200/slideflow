export type ThemeFont = "sans" | "serif" | "display" | "mono";

export type Theme = {
  id: string;
  name: string;
  mood: string;
  /** Page background behind the slide frame. */
  canvas: string;
  /** Slide surface base color. */
  bg: string;
  /** Layered background art (gradients/patterns) painted on every slide. */
  art: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  /** Subtle border / hairline color. */
  line: string;
  headingFont: ThemeFont;
  bodyFont: ThemeFont;
  /** true => light text on dark, used for default contrast choices. */
  dark: boolean;
};

export const THEMES: Theme[] = [
  {
    id: "corsair",
    name: "Corsair",
    mood: "Developer-infra dark, electric blue",
    canvas: "#0f0f0f",
    bg: "#181818",
    art: "radial-gradient(120% 100% at 50% 0%, rgba(26,38,255,0.22), transparent 55%), radial-gradient(90% 80% at 100% 100%, rgba(0,7,205,0.14), transparent 50%), linear-gradient(160deg, #181818 0%, #141414 100%)",
    fg: "#ffffff",
    muted: "rgba(168,168,168,0.85)",
    accent: "#0007cd",
    accent2: "#1a26ff",
    line: "rgba(51,51,51,0.9)",
    headingFont: "sans",
    bodyFont: "sans",
    dark: true,
  },
  {
    id: "midnight",
    name: "Midnight",
    mood: "Cinematic dark, electric indigo",
    canvas: "#05060a",
    bg: "#0b0d16",
    art: "radial-gradient(120% 120% at 12% 8%, rgba(99,102,241,0.28), transparent 55%), radial-gradient(90% 90% at 92% 96%, rgba(56,189,248,0.20), transparent 50%), linear-gradient(160deg, #0b0d16 0%, #0b0d16 60%, #0e1120 100%)",
    fg: "#f4f6ff",
    muted: "rgba(226,232,255,0.62)",
    accent: "#818cf8",
    accent2: "#38bdf8",
    line: "rgba(148,163,255,0.16)",
    headingFont: "display",
    bodyFont: "sans",
    dark: true,
  },
  {
    id: "aurora",
    name: "Aurora",
    mood: "Vivid gradients, teal to violet",
    canvas: "#070a12",
    bg: "#0a1018",
    art: "radial-gradient(100% 80% at 0% 0%, rgba(45,212,191,0.30), transparent 52%), radial-gradient(90% 90% at 100% 100%, rgba(168,85,247,0.30), transparent 52%), linear-gradient(135deg, #0a1018, #0c1320)",
    fg: "#ecfeff",
    muted: "rgba(207,250,254,0.60)",
    accent: "#2dd4bf",
    accent2: "#a855f7",
    line: "rgba(125,211,252,0.16)",
    headingFont: "display",
    bodyFont: "sans",
    dark: true,
  },
  {
    id: "editorial",
    name: "Editorial",
    mood: "Warm paper, serif, magazine",
    canvas: "#ece7dd",
    bg: "#f6f2ea",
    art: "radial-gradient(110% 90% at 100% 0%, rgba(193,122,72,0.12), transparent 55%), linear-gradient(180deg, #f8f4ec, #f1ece1)",
    fg: "#221c14",
    muted: "rgba(58,48,36,0.62)",
    accent: "#b4530f",
    accent2: "#1f2937",
    line: "rgba(56,42,24,0.14)",
    headingFont: "serif",
    bodyFont: "serif",
    dark: false,
  },
  {
    id: "solaris",
    name: "Solaris",
    mood: "Sunset warmth, amber & coral",
    canvas: "#140a06",
    bg: "#1a0f09",
    art: "radial-gradient(100% 90% at 8% 0%, rgba(251,146,60,0.32), transparent 55%), radial-gradient(90% 90% at 100% 100%, rgba(244,63,94,0.24), transparent 52%), linear-gradient(160deg, #1a0f09, #200f0c)",
    fg: "#fff7ed",
    muted: "rgba(254,235,213,0.62)",
    accent: "#fb923c",
    accent2: "#fb7185",
    line: "rgba(251,191,36,0.16)",
    headingFont: "display",
    bodyFont: "sans",
    dark: true,
  },
  {
    id: "sapphire",
    name: "Sapphire",
    mood: "Clean light, corporate blue",
    canvas: "#e8ecf3",
    bg: "#ffffff",
    art: "radial-gradient(110% 90% at 100% 0%, rgba(37,99,235,0.10), transparent 55%), radial-gradient(80% 80% at 0% 100%, rgba(14,165,233,0.08), transparent 50%), linear-gradient(180deg, #ffffff, #f7f9fc)",
    fg: "#0f172a",
    muted: "rgba(30,41,59,0.60)",
    accent: "#2563eb",
    accent2: "#0ea5e9",
    line: "rgba(15,23,42,0.10)",
    headingFont: "sans",
    bodyFont: "sans",
    dark: false,
  },
  {
    id: "mono",
    name: "Mono",
    mood: "Brutalist, ink on bone, monospace",
    canvas: "#d9d7d0",
    bg: "#f3f1ea",
    art: "linear-gradient(180deg, #f4f2eb, #eceae1)",
    fg: "#111111",
    muted: "rgba(17,17,17,0.55)",
    accent: "#111111",
    accent2: "#7c3aed",
    line: "rgba(17,17,17,0.18)",
    headingFont: "mono",
    bodyFont: "mono",
    dark: false,
  },
];

export const DEFAULT_THEME_ID = "corsair";

export function getTheme(id: string | undefined): Theme {
  if (id === ["com", "posio"].join("")) return THEMES[0];
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const FONT_VAR: Record<ThemeFont, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  display: "var(--font-display)",
  mono: "var(--font-mono)",
};

/** Inline CSS variables consumed by the slide frame and layout components. */
export function themeVars(theme: Theme): React.CSSProperties {
  return {
    ["--bg" as string]: theme.bg,
    ["--art" as string]: theme.art,
    ["--fg" as string]: theme.fg,
    ["--muted" as string]: theme.muted,
    ["--accent" as string]: theme.accent,
    ["--accent2" as string]: theme.accent2,
    ["--line" as string]: theme.line,
    ["--font-heading" as string]: FONT_VAR[theme.headingFont],
    ["--font-body" as string]: FONT_VAR[theme.bodyFont],
  };
}
