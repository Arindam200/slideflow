"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Palette, AlertTriangle, Loader2, Check, Share2, Layers } from "lucide-react";
import { DeckSchema, mergeDeck, normalizeDeck, toExportSlides, type GenerateRequest, type PartialSlide, type Slide } from "@/lib/deck";
import { DEFAULT_THEME_ID, getTheme, THEMES } from "@/lib/themes";
import { takeRequest, clearRequest } from "@/lib/store";
import { shouldSubmit, resetGenerationGuard } from "@/lib/generation";
import { IMAGE_LAYOUTS } from "@/lib/image-prompt";
import { Logo } from "@/components/Logo";
import { SlideView } from "@/components/slide/SlideView";
import { SlideStage } from "@/components/slide/SlideStage";
import { SlideSkeleton } from "@/components/slide/SlideSkeleton";
import { ExportMenu } from "./ExportMenu";
import { PresentMode } from "./PresentMode";
import { PublishPanel } from "./PublishPanel";
import { Composer } from "@/components/Composer";

export function Studio() {
  const router = useRouter();
  const [request, setRequest] = useState<GenerateRequest | null>(null);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [streamDone, setStreamDone] = useState(false);

  const [deck, setDeck] = useState<{ title?: string; subtitle?: string; slides?: (PartialSlide | undefined)[] }>({});
  const editedRef = useRef(false);
  const followRef = useRef(true);
  const nodesRef = useRef<(HTMLElement | null)[]>([]);

  const [images, setImages] = useState<Record<number, string>>({});
  const [imgEnabled, setImgEnabled] = useState(false);
  const [imgBusy, setImgBusy] = useState<Record<number, boolean>>({});
  const imgReqRef = useRef<Set<number>>(new Set());

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/generate",
    schema: DeckSchema,
    onFinish: ({ object: final }) => {
      if (final && !editedRef.current) {
        setDeck(normalizeDeck(final as typeof deck));
      }
    },
  });

  useEffect(() => {
    const stored = takeRequest();
    if (!stored) {
      router.replace("/");
      return;
    }
    const { _epoch, ...req } = stored;
    setRequest(req);
    setThemeId(req.themeId);
    const epoch = _epoch ?? 0;
    if (shouldSubmit(epoch)) submit(req);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (object && !editedRef.current) {
      setDeck((prev) => normalizeDeck(mergeDeck(prev, object as typeof deck)));
    }
  }, [object]);

  useEffect(() => {
    if (!isLoading && request) setStreamDone(true);
  }, [isLoading, request]);

  useEffect(() => {
    fetch("/api/image")
      .then((r) => r.json())
      .then((d) => setImgEnabled(!!d.enabled))
      .catch(() => {});
  }, []);

  const slides = useMemo(
    () => (deck.slides ?? []).filter((s): s is PartialSlide => Boolean(s && (s.title || s.layout))),
    [deck.slides],
  );

  const exportSlides = useMemo(() => toExportSlides(slides), [slides]);
  const cleanSlides = exportSlides;

  useEffect(() => {
    if (isLoading && followRef.current && slides.length) setCurrent(slides.length - 1);
  }, [slides.length, isLoading]);

  useEffect(() => {
    if (streamDone && !isLoading && cleanSlides.length > 0) clearRequest();
  }, [streamDone, isLoading, cleanSlides.length]);

  const theme = getTheme(themeId);
  const expected = request?.slideCount ?? 8;
  const total = Math.max(slides.length, expected);
  const canExport = !isLoading && cleanSlides.length > 0;
  const progress = expected > 0 ? Math.min(100, Math.round((slides.length / expected) * 100)) : 0;

  function patchSlide(index: number, next: PartialSlide) {
    editedRef.current = true;
    setDeck((d) => {
      const arr = [...(d.slides ?? [])];
      arr[index] = next;
      return { ...d, slides: arr };
    });
  }

  function regenerate(req: GenerateRequest) {
    editedRef.current = false;
    followRef.current = true;
    setStreamDone(false);
    resetGenerationGuard();
    setDeck({});
    setCurrent(0);
    setImages({});
    setImgBusy({});
    imgReqRef.current.clear();
    setThemeId(req.themeId);
    setRequest(req);
    setTweakOpen(false);
    submit(req);
  }

  useEffect(() => {
    if (isLoading || !imgEnabled || cleanSlides.length === 0) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < cleanSlides.length; i++) {
        const s = cleanSlides[i];
        if (!s.layout || !IMAGE_LAYOUTS.has(s.layout)) continue;
        if (imgReqRef.current.has(i)) continue;
        imgReqRef.current.add(i);
        setImgBusy((b) => ({ ...b, [i]: true }));
        try {
          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: s.title, visual: s.visual, mood: theme.mood, layout: s.layout }),
          });
          const json = await res.json();
          if (!cancelled && json.ok && json.dataUrl) {
            setImages((m) => ({ ...m, [i]: json.dataUrl as string }));
          }
        } catch {
          /* keep CSS art */
        } finally {
          if (!cancelled) setImgBusy((b) => ({ ...b, [i]: false }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, imgEnabled, cleanSlides.length]);

  const showEmpty = streamDone && !isLoading && !error && slides.length === 0;
  const activeSlide = slides[current];
  const showSkeleton = isLoading && !activeSlide;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-2.5">
        <button onClick={() => router.push("/")} className="shrink-0 transition hover:opacity-80">
          <Logo size={22} />
        </button>

        <div className="mx-1 h-5 w-px bg-edge" />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-white/90">
            {deck.title || (isLoading ? "Designing your deck…" : "Untitled deck")}
          </div>
          {isLoading && (
            <div className="mt-1.5 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-panel-2">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${Math.max(progress, 8)}%` }}
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <span className="flex items-center gap-2 rounded-md border border-edge bg-panel px-3 py-1.5 text-[12.5px] text-body">
            <Loader2 size={13} className="animate-spin text-brand" />
            {slides.length} / {expected} slides
          </span>
        ) : cleanSlides.length > 0 ? (
          <span className="flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-3 py-1.5 text-[12.5px] text-ok">
            <Check size={13} /> Ready · {cleanSlides.length} slides
          </span>
        ) : showEmpty ? (
          <span className="flex items-center gap-1.5 rounded-md border border-err/30 bg-err/10 px-3 py-1.5 text-[12.5px] text-err">
            <AlertTriangle size={13} /> No slides
          </span>
        ) : null}

        <div className="relative">
          <button
            onClick={() => setThemeOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-edge bg-panel-2 px-3 py-2 text-[13px] text-body transition hover:border-edge-strong hover:text-white"
          >
            <Palette size={15} /> {theme.name}
          </button>
          {themeOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 animate-float-up rounded-lg border border-edge bg-panel-3 p-1.5 shadow-none">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setThemeId(t.id);
                    setThemeOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-panel-2 ${t.id === themeId ? "bg-panel-2" : ""}`}
                >
                  <span className="flex h-5 w-5 overflow-hidden rounded-full" style={{ background: t.bg, border: "1px solid rgba(255,255,255,0.18)" }}>
                    <span style={{ width: "50%", background: t.accent }} />
                    <span style={{ width: "50%", background: t.accent2 }} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] text-white/90">{t.name}</span>
                    <span className="block text-[11px] text-muted">{t.mood}</span>
                  </span>
                  {t.id === themeId && <Check size={14} className="text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => (isLoading ? stop() : setTweakOpen(true))}
          className="flex items-center gap-2 rounded-md border border-edge bg-panel-2 px-3 py-2 text-[13px] text-body transition hover:border-edge-strong hover:text-white"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Stop
            </>
          ) : (
            <>
              <RotateCcw size={14} /> Regenerate
            </>
          )}
        </button>

        <button
          onClick={() => setPresenting(true)}
          disabled={cleanSlides.length === 0}
          className="flex items-center gap-2 rounded-md border border-edge bg-panel-2 px-3 py-2 text-[13px] text-body transition hover:border-edge-strong hover:text-white disabled:opacity-40"
        >
          <Play size={14} /> Present
        </button>

        {canExport ? (
          <ExportMenu
            deck={{ title: deck.title || "Untitled deck", subtitle: deck.subtitle, slides: cleanSlides }}
            theme={theme}
            getNodes={() => nodesRef.current.filter(Boolean) as HTMLElement[]}
          />
        ) : (
          <span className="rounded-md bg-panel px-3.5 py-2 text-[13.5px] font-medium text-muted-soft">Export</span>
        )}

        <button
          onClick={() => setPublishing(true)}
          disabled={!canExport}
          className="flex items-center gap-2 rounded-md bg-brand px-3.5 py-2 text-[13.5px] font-medium text-white transition hover:bg-brand-active disabled:opacity-40"
        >
          <Share2 size={15} /> Share
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-edge bg-panel/30">
          <div className="flex items-center gap-2 border-b border-edge-soft px-4 py-3">
            <Layers size={14} className="text-muted" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Slides</span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-soft">
              {slides.length}/{expected}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-2.5">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    followRef.current = false;
                    setCurrent(i);
                  }}
                  className={`group relative block w-full shrink-0 overflow-hidden rounded-lg border text-left transition ${
                    current === i ? "border-brand ring-1 ring-brand-2/35" : "border-edge hover:border-edge-strong"
                  }`}
                >
                  <span className="absolute left-1.5 top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded bg-black/50 px-1 text-[10px] font-medium tabular-nums text-white/80 backdrop-blur">
                    {i + 1}
                  </span>
                  <SlideStage>
                    <SlideView slide={s} theme={theme} index={i} total={total} deckTitle={deck.title} image={images[i]} bare loading={isLoading} />
                  </SlideStage>
                  {s.title && (
                    <div className="absolute inset-x-0 bottom-0 z-10 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[10px] text-white/75">
                      {s.title}
                    </div>
                  )}
                  {imgBusy[i] && (
                    <span className="absolute bottom-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/45 backdrop-blur">
                      <Loader2 size={11} className="animate-spin text-white/80" />
                    </span>
                  )}
                </button>
              ))}

              {isLoading &&
                Array.from({ length: Math.max(0, expected - slides.length) }).map((_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="overflow-hidden rounded-lg border border-dashed border-edge bg-panel-2/50"
                  >
                    <SlideStage>
                      <SlideSkeleton themeId={themeId} index={slides.length + i} />
                    </SlideStage>
                  </div>
                ))}
            </div>
          </div>
        </aside>

        <main className="studio-spotlight relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {error ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <ErrorCard message={(error as Error)?.message} onRetry={() => request && regenerate(request)} />
            </div>
          ) : showEmpty ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyDeckCard onRetry={() => request && regenerate(request)} />
            </div>
          ) : showSkeleton || activeSlide ? (
            <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-6 md:p-10">
              <div
                className="w-full shrink-0"
                style={{ maxWidth: "min(100%, calc((100vh - 180px) * 16 / 9))" }}
              >
                <div className="overflow-hidden rounded-xl border border-edge-strong ring-1 ring-brand-2/10">
                  <SlideStage>
                    {showSkeleton ? (
                      <SlideSkeleton themeId={themeId} index={current} />
                    ) : (
                      <SlideView
                        slide={activeSlide!}
                        theme={theme}
                        index={current}
                        total={total}
                        deckTitle={deck.title}
                        image={images[current]}
                        editable={!isLoading}
                        loading={isLoading}
                        onChange={(next) => patchSlide(current, next)}
                      />
                    )}
                  </SlideStage>
                </div>

                <div className="mt-4 flex flex-col items-center gap-2">
                  {isLoading ? (
                    <BuildingState progress={progress} slideCount={slides.length} expected={expected} />
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-center text-[12px] text-muted">
                      {imgBusy[current] ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-brand" /> Painting artwork…
                        </>
                      ) : (
                        <>
                          Click any text to edit ·{" "}
                          {activeSlide?.notes ? "speaker notes attached" : "no speaker notes"}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <BuildingState progress={0} slideCount={0} expected={expected} />
            </div>
          )}
        </main>
      </div>

      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}>
        {cleanSlides.map((s, i) => (
          <div key={i} ref={(el) => { nodesRef.current[i] = el; }}>
            <SlideView slide={s} theme={theme} index={i} total={cleanSlides.length} deckTitle={deck.title} image={images[i]} loading={false} />
          </div>
        ))}
      </div>

      {presenting && (
        <PresentMode slides={cleanSlides} theme={theme} deckTitle={deck.title} images={images} start={current} onClose={() => setPresenting(false)} />
      )}

      {publishing && (
        <PublishPanel
          title={deck.title || "Untitled deck"}
          getNodes={() => nodesRef.current.filter(Boolean) as HTMLElement[]}
          onClose={() => setPublishing(false)}
        />
      )}

      {tweakOpen && request && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm" onClick={() => setTweakOpen(false)}>
          <div className="mt-[8vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-white/90">Tweak & regenerate</h2>
              <button onClick={() => setTweakOpen(false)} className="text-muted hover:text-white/80">
                Close
              </button>
            </div>
            <Composer onSubmit={regenerate} initial={request} compact busy={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function BuildingState({ progress, slideCount, expected }: { progress: number; slideCount: number; expected: number }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-3">
        <Loader2 size={14} className="animate-spin text-brand" />
        <p className="text-[13px] font-medium text-white/80">
          {slideCount === 0 ? "Outlining your narrative…" : `Writing slide ${slideCount + 1} of ${expected}…`}
        </p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-panel-2">
        <div className="progress-indeterminate h-full w-1/3 rounded-full bg-brand-2/60" style={{ width: `${Math.max(progress, 12)}%` }} />
      </div>
      <p className="text-[12px] text-muted">Slides stream in as they&apos;re written, no need to wait for the full deck.</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="max-w-md rounded-xl border border-err/30 bg-err/[0.06] p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-err" size={26} />
      <p className="text-[15px] font-medium text-white/90">Generation failed</p>
      <p className="mt-2 text-[13px] leading-relaxed text-body">
        {message || "Something went wrong. Check that your model API key is set in .env.local."}
      </p>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md border border-edge-strong bg-panel-2 px-4 py-2 text-[13px] font-medium text-white hover:bg-panel-3">
        <RotateCcw size={14} /> Try again
      </button>
    </div>
  );
}

function EmptyDeckCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="max-w-md rounded-xl border border-edge bg-panel p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-muted" size={26} />
      <p className="text-[15px] font-medium text-white/90">No slides were generated</p>
      <p className="mt-2 text-[13px] leading-relaxed text-body">
        The model returned an empty response. Try regenerating, or set{" "}
        <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[12px] text-white/80">DECK_STRUCTURED_OUTPUTS=false</code>{" "}
        if your model doesn&apos;t support JSON schema streaming.
      </p>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-active">
        <RotateCcw size={14} /> Regenerate
      </button>
    </div>
  );
}
