"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import type { PartialSlide, Slide } from "@/lib/deck";
import { normalizeSlide } from "@/lib/deck";
import type { Theme } from "@/lib/themes";
import { themeVars } from "@/lib/themes";
import { SLIDE_W, SLIDE_H } from "@/lib/export-client";
import { imageModeFor, type ImageMode } from "@/lib/image-prompt";

type EditCtx = {
  editable: boolean;
  loading: boolean;
  commit: (updater: (s: Slide) => Slide) => void;
};
const EditContext = createContext<EditCtx>({ editable: false, loading: false, commit: () => {} });

type Props = {
  slide: PartialSlide;
  theme: Theme;
  index: number;
  total: number;
  deckTitle?: string;
  bare?: boolean;
  editable?: boolean;
  /** While true, empty fields show skeleton bars; when false, empty fields stay blank. */
  loading?: boolean;
  onChange?: (next: PartialSlide) => void;
  /** Generated background image (data URL). */
  image?: string;
};

const PAD = 84;

export function SlideView({
  slide,
  theme,
  index,
  total,
  deckTitle,
  bare,
  editable = false,
  loading = false,
  onChange,
  image,
}: Props) {
  const normalized = normalizeSlide(slide);
  const layout = normalized.layout ?? "bullets";
  const commit = (updater: (s: Slide) => Slide) =>
    onChange?.(updater(normalized as Slide));
  const imgMode = image ? imageModeFor(layout) : null;

  return (
    <EditContext.Provider value={{ editable: editable && !!onChange, loading, commit }}>
      <div
        data-slide
        className="grain relative overflow-hidden"
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          background: "var(--bg)",
          backgroundImage: "var(--art)",
          color: "var(--fg)",
          fontFamily: "var(--font-body)",
          ...themeVars(theme),
        }}
      >
        {imgMode === "full-bleed" && <FullBleedImage src={image!} />}
        {imgMode === "vignette" && <VignetteImage src={image!} />}
        {imgMode === "ambient" && <AmbientImage src={image!} />}
        {!imgMode && <Motif index={index} layout={layout} />}
        <div className="relative flex h-full flex-col" style={{ padding: PAD }}>
          <Body layout={layout} slide={normalized} index={index} image={image} imgMode={imgMode} />
        </div>
        {!bare && layout !== "cover" && (
          <Footer deckTitle={deckTitle} index={index} total={total} />
        )}
      </div>
    </EditContext.Provider>
  );
}

/** Full-bleed generated image with a theme-tinted scrim for text legibility. */
function FullBleedImage({ src }: { src: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 78%, transparent) 30%, transparent 64%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(0deg, color-mix(in srgb, var(--bg) 45%, transparent), transparent 40%)" }}
      />
    </div>
  );
}

/** Centered content layouts; vignette keeps quote text readable. */
function VignetteImage({ src }: { src: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, color-mix(in srgb, var(--bg) 88%, transparent) 0%, color-mix(in srgb, var(--bg) 55%, transparent) 55%, transparent 100%)",
        }}
      />
    </div>
  );
}

/** Text-heavy layouts; soft background, heavy scrim for readability. */
function AmbientImage({ src }: { src: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-45"
        style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center right" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, transparent) 45%, color-mix(in srgb, var(--bg) 72%, transparent) 100%)",
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function Body({
  layout,
  slide,
  index,
  image,
  imgMode,
}: {
  layout: string;
  slide: PartialSlide;
  index: number;
  image?: string;
  imgMode?: ImageMode | null;
}) {
  switch (layout) {
    case "cover":
      return <Cover slide={slide} />;
    case "section":
      return <Section slide={slide} index={index} />;
    case "stat":
      return <StatLayout slide={slide} />;
    case "quote":
      return <Quote slide={slide} />;
    case "two-column":
    case "comparison":
      return <TwoColumn slide={slide} compare={layout === "comparison"} />;
    case "timeline":
      return <Timeline slide={slide} />;
    case "spotlight":
      return <Spotlight slide={slide} image={image} showPanel={imgMode === "panel"} />;
    case "closing":
      return <Closing slide={slide} />;
    case "bullets":
    default:
      return <Bullets slide={slide} />;
  }
}

/** contentEditable text that commits on blur without fighting React re-renders. */
function Editable({
  value,
  onCommit,
  placeholder,
  style,
  className,
  multiline = false,
}: {
  value: string | undefined;
  onCommit: (v: string) => void;
  placeholder?: number;
  style?: CSSProperties;
  className?: string;
  multiline?: boolean;
}) {
  const { editable, loading } = useContext(EditContext);
  const ref = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);

  // Sync external value in only while not being edited (e.g. during streaming).
  useEffect(() => {
    const el = ref.current;
    if (el && !focused.current && el.textContent !== (value ?? "")) {
      el.textContent = value ?? "";
    }
  }, [value]);

  if (!editable) {
    if (value?.trim()) {
      return (
        <span className={className} style={style}>
          {value}
        </span>
      );
    }
    return loading ? <Ghost w={placeholder ?? 360} /> : null;
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={className}
      style={{ outline: "none", cursor: "text", ...style }}
      onFocus={() => (focused.current = true)}
      onBlur={(e) => {
        focused.current = false;
        const text = (e.currentTarget.textContent ?? "").replace(/\n+/g, multiline ? "\n" : " ").trim();
        if (text !== (value ?? "")) onCommit(text);
      }}
    />
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-5 inline-flex items-center gap-3 text-[15px] font-semibold uppercase"
      style={{ color: "var(--accent)", letterSpacing: "0.22em" }}
    >
      <span style={{ width: 34, height: 3, background: "var(--accent)", borderRadius: 2 }} />
      {children}
    </div>
  );
}

function Cover({ slide }: { slide: PartialSlide }) {
  const { commit } = useContext(EditContext);
  return (
    <div className="flex h-full flex-col justify-center" style={{ maxWidth: 1000 }}>
      <Kicker>Presentation</Kicker>
      <Editable
        value={slide.title}
        onCommit={(v) => commit((s) => ({ ...s, title: v }))}
        placeholder={620}
        className="block font-semibold"
        style={{ fontFamily: "var(--font-heading)", fontSize: 86, lineHeight: 1.0, letterSpacing: "-0.03em" }}
      />
      <Editable
        value={slide.subtitle}
        onCommit={(v) => commit((s) => ({ ...s, subtitle: v }))}
        className="mt-7 block text-[26px] leading-snug"
        style={{ color: "var(--muted)", maxWidth: 820 }}
      />
    </div>
  );
}

function Section({ slide, index }: { slide: PartialSlide; index: number }) {
  const { commit } = useContext(EditContext);
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mb-6 text-[120px] font-bold leading-none" style={{ fontFamily: "var(--font-heading)", color: "var(--accent)", opacity: 0.9 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <Editable
        value={slide.title}
        onCommit={(v) => commit((s) => ({ ...s, title: v }))}
        placeholder={520}
        className="block font-semibold leading-[1.04]"
        style={{ fontFamily: "var(--font-heading)", fontSize: 64, letterSpacing: "-0.02em", maxWidth: 1000 }}
      />
      <Editable
        value={slide.body}
        multiline
        onCommit={(v) => commit((s) => ({ ...s, body: v }))}
        className="mt-6 block text-[22px] leading-relaxed"
        style={{ color: "var(--muted)", maxWidth: 760 }}
      />
    </div>
  );
}

function Heading({ value, onCommit }: { value?: string; onCommit: (v: string) => void }) {
  return (
    <Editable
      value={value}
      onCommit={onCommit}
      placeholder={540}
      className="block font-semibold leading-[1.04]"
      style={{ fontFamily: "var(--font-heading)", fontSize: 46, letterSpacing: "-0.02em", maxWidth: 1000 }}
    />
  );
}

function Bullets({ slide }: { slide: PartialSlide }) {
  const { commit, loading } = useContext(EditContext);
  const bullets = slide.bullets ?? [];
  let list = bullets.length ? bullets : loading ? ph(3) : [];
  if (!list.length && slide.body?.trim()) {
    list = slide.body.split(/[.;]\s+/).filter(Boolean).slice(0, 5).map((text) => ({ text }));
  }
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>{slide.subtitle ?? "Overview"}</Kicker>
      <Heading value={slide.title} onCommit={(v) => commit((s) => ({ ...s, title: v }))} />
      {list.length > 0 ? (
        <ul className="mt-9 flex flex-col gap-5" style={{ maxWidth: 980 }}>
          {list.map((b, i) => (
            <li key={i} className="flex items-start gap-5 animate-float-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span
                className="mt-1 flex shrink-0 items-center justify-center text-[15px] font-bold"
                style={{
                  width: 30, height: 30, borderRadius: 9, color: "var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <Editable
                  value={b?.text}
                  onCommit={(v) =>
                    commit((s) => ({
                      ...s,
                      bullets: (s.bullets ?? []).map((x, j) => (j === i ? { ...x, text: v } : x)),
                    }))
                  }
                  placeholder={420}
                  className="block text-[26px] font-medium leading-snug"
                  style={{ fontFamily: "var(--font-heading)" }}
                />
                {b?.detail && (
                  <div className="mt-1 text-[18px] leading-snug" style={{ color: "var(--muted)" }}>
                    {b.detail}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : slide.body?.trim() ? (
        <p className="mt-9 max-w-[980px] text-[22px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {slide.body}
        </p>
      ) : null}
    </div>
  );
}

function TwoColumn({ slide, compare }: { slide: PartialSlide; compare: boolean }) {
  const { commit, loading } = useContext(EditContext);
  const cols = (slide.columns ?? []).slice(0, 2);
  const hasContent = cols.some((c) => c?.heading?.trim() || c?.bullets?.some((b) => b?.trim()));
  const filled = hasContent
    ? cols
    : loading
      ? [phCol(), phCol()]
      : [
          { heading: compare ? "Before" : "Column A", bullets: slide.body ? [slide.body] : [] },
          { heading: compare ? "After" : "Column B", bullets: [] },
        ];
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>{compare ? "Head to head" : slide.subtitle ?? "Compare"}</Kicker>
      <Heading value={slide.title} onCommit={(v) => commit((s) => ({ ...s, title: v }))} />
      <div className="mt-10 grid grid-cols-2 gap-6">
        {filled.map((c, i) => (
          <div
            key={i}
            className="animate-float-up rounded-2xl p-7"
            style={{
              animationDelay: `${i * 80}ms`,
              background: "color-mix(in srgb, var(--fg) 5%, transparent)",
              border: "1px solid var(--line)",
              borderTop: `3px solid ${i === 0 ? "var(--accent)" : "var(--accent2)"}`,
            }}
          >
            <div className="mb-4 text-[24px] font-semibold" style={{ fontFamily: "var(--font-heading)", color: i === 0 ? "var(--accent)" : "var(--accent2)" }}>
              {c.heading?.trim() ? c.heading : compare ? (i === 0 ? "Before" : "After") : `Column ${i + 1}`}
            </div>
            <ul className="flex flex-col gap-3">
              {(c.bullets?.length ? c.bullets : [""]).map((b, j) => (
                <li key={j} className="flex gap-3 text-[19px] leading-snug">
                  <span style={{ color: i === 0 ? "var(--accent)" : "var(--accent2)" }}>-</span>
                  <span>{b?.trim() ? b : loading ? <Ghost w={280} /> : null}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatLayout({ slide }: { slide: PartialSlide }) {
  const { commit, loading } = useContext(EditContext);
  const stats = (slide.stats ?? []).slice(0, 3);
  const filled = stats.length ? stats : loading ? [{ value: "", label: "" }, { value: "", label: "" }] : [];
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>{slide.subtitle ?? "By the numbers"}</Kicker>
      <Heading value={slide.title} onCommit={(v) => commit((s) => ({ ...s, title: v }))} />
      <div className="mt-12 flex flex-wrap gap-x-20 gap-y-10">
        {filled.map((s, i) => (
          <div key={i} className="animate-float-up" style={{ animationDelay: `${i * 90}ms` }}>
            <div
              className="font-bold leading-none"
              style={{
                fontFamily: "var(--font-heading)", fontSize: 104, letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}
            >
              {s.value?.trim() ? s.value : loading ? <Ghost w={120} /> : null}
            </div>
            <div className="mt-2 text-[21px]" style={{ color: "var(--muted)", maxWidth: 320 }}>
              {s.label?.trim() ? s.label : loading ? <Ghost w={180} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quote({ slide }: { slide: PartialSlide }) {
  const { commit } = useContext(EditContext);
  return (
    <div className="flex h-full flex-col justify-center" style={{ maxWidth: 1040 }}>
      <div className="leading-none" style={{ fontFamily: "var(--font-heading)", fontSize: 160, height: 70, color: "var(--accent)", opacity: 0.55 }}>
        “
      </div>
      <Editable
        value={slide.quote ?? slide.title}
        multiline
        onCommit={(v) => commit((s) => ({ ...s, quote: v }))}
        placeholder={760}
        className="block text-[44px] font-medium leading-[1.18]"
        style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.01em" }}
      />
      <Editable
        value={slide.attribution ? `- ${slide.attribution}` : undefined}
        onCommit={(v) => commit((s) => ({ ...s, attribution: v.replace(/^-\s*/, "") }))}
        className="mt-8 block text-[22px] font-semibold"
        style={{ color: "var(--accent)" }}
      />
    </div>
  );
}

function Timeline({ slide }: { slide: PartialSlide }) {
  const { commit, loading } = useContext(EditContext);
  const steps = (slide.steps ?? []).slice(0, 5);
  const filled = steps.length ? steps : loading ? ph(3).map(() => ({ title: "", description: "" })) : [];
  return (
    <div className="flex h-full flex-col justify-center">
      <Kicker>{slide.subtitle ?? "How it works"}</Kicker>
      <Heading value={slide.title} onCommit={(v) => commit((s) => ({ ...s, title: v }))} />
      <div className="mt-11 flex items-stretch gap-4">
        {filled.map((s, i) => (
          <div key={i} className="relative flex-1 animate-float-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#08070f" }}>
                {i + 1}
              </span>
              {i < filled.length - 1 && <span className="h-px flex-1" style={{ background: "var(--line)" }} />}
            </div>
            <div className="text-[21px] font-semibold leading-snug" style={{ fontFamily: "var(--font-heading)" }}>
              {s.title?.trim() ? s.title : loading ? <Ghost w={140} /> : null}
            </div>
            <div className="mt-2 text-[16px] leading-snug" style={{ color: "var(--muted)" }}>
              {s.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spotlight({ slide, image, showPanel }: { slide: PartialSlide; image?: string; showPanel?: boolean }) {
  const { commit } = useContext(EditContext);
  return (
    <div className="grid h-full grid-cols-[1.15fr_0.85fr] items-center gap-12">
      <div>
        <Kicker>{slide.subtitle ?? "In focus"}</Kicker>
        <Editable
          value={slide.title}
          onCommit={(v) => commit((s) => ({ ...s, title: v }))}
          placeholder={420}
          className="block font-semibold leading-[1.04]"
          style={{ fontFamily: "var(--font-heading)", fontSize: 52, letterSpacing: "-0.02em" }}
        />
        <Editable
          value={slide.body}
          multiline
          onCommit={(v) => commit((s) => ({ ...s, body: v }))}
          className="mt-7 block text-[23px] leading-relaxed"
          style={{ color: "var(--muted)" }}
        />
      </div>
      <div className="relative h-[440px] overflow-hidden rounded-3xl" style={{ border: "1px solid var(--line)", background: "color-mix(in srgb, var(--fg) 4%, transparent)" }}>
        {showPanel && image ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 60%), radial-gradient(120% 90% at 90% 100%, color-mix(in srgb, var(--accent2) 50%, transparent), transparent 55%)",
              }}
            />
            <div className="grain absolute inset-0" />
          </>
        )}
      </div>
    </div>
  );
}

function Closing({ slide }: { slide: PartialSlide }) {
  const { commit } = useContext(EditContext);
  return (
    <div className="flex h-full flex-col items-start justify-center" style={{ maxWidth: 920 }}>
      <Kicker>Thank you</Kicker>
      <Editable
        value={slide.title}
        onCommit={(v) => commit((s) => ({ ...s, title: v }))}
        placeholder={520}
        className="block font-semibold"
        style={{ fontFamily: "var(--font-heading)", fontSize: 72, lineHeight: 1.02, letterSpacing: "-0.03em" }}
      />
      <Editable
        value={slide.subtitle}
        onCommit={(v) => commit((s) => ({ ...s, subtitle: v }))}
        className="mt-6 block text-[24px]"
        style={{ color: "var(--muted)" }}
      />
    </div>
  );
}

function Footer({ deckTitle, index, total }: { deckTitle?: string; index: number; total: number }) {
  return (
    <div className="absolute flex items-center justify-between text-[14px]" style={{ left: PAD, right: PAD, bottom: 40, color: "var(--muted)" }}>
      <span className="truncate" style={{ maxWidth: 600 }}>{deckTitle}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

function Motif({ index, layout }: { index: number; layout: string }) {
  if (layout === "spotlight") return null;
  const positions = [
    { top: -160, right: -120 },
    { bottom: -180, left: -140 },
    { top: -140, left: -160 },
    { bottom: -160, right: -120 },
  ];
  const p = positions[index % positions.length];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        width: 520, height: 520, borderRadius: "50%", filter: "blur(8px)", opacity: 0.5,
        background: "radial-gradient(circle at center, color-mix(in srgb, var(--accent) 22%, transparent), transparent 62%)",
        ...p,
      }}
    />
  );
}

function Ghost({ w }: { w: number }) {
  return <span className="skeleton inline-block rounded-md align-middle" style={{ width: w, maxWidth: "70%", height: "0.7em" }} />;
}

function ph(n: number) {
  return Array.from({ length: n }, () => ({ text: "", detail: undefined }));
}
function phCol() {
  return { heading: "", bullets: ["", ""] };
}
