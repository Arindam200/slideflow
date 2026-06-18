"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import type { Slide } from "@/lib/deck";
import type { Theme } from "@/lib/themes";
import { SlideView } from "@/components/slide/SlideView";
import { SlideStage } from "@/components/slide/SlideStage";

export function PresentMode({
  slides,
  theme,
  deckTitle,
  images,
  start = 0,
  onClose,
}: {
  slides: Slide[];
  theme: Theme;
  deckTitle?: string;
  images?: Record<number, string>;
  start?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const [showNotes, setShowNotes] = useState(false);
  const total = slides.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") setI((p) => Math.min(total - 1, p + 1));
      else if (e.key === "ArrowLeft") setI((p) => Math.max(0, p - 1));
      else if (e.key.toLowerCase() === "n") setShowNotes((s) => !s);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  const slide = slides[i];
  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex flex-1 items-center justify-center p-[3vh]">
        <div className="w-full" style={{ maxWidth: "min(96vw, calc((100vh - 12vh) * 16 / 9))" }}>
          <SlideStage>
            <SlideView slide={slide} theme={theme} index={i} total={total} deckTitle={deckTitle} image={images?.[i]} />
          </SlideStage>
        </div>
      </div>

      {showNotes && slide.notes && (
        <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[14px] leading-relaxed text-white/70">
          <span className="font-semibold text-white/90">Notes · </span>
          {slide.notes}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pb-5">
        <Ctrl onClick={() => setI((p) => Math.max(0, p - 1))} disabled={i === 0}><ChevronLeft size={18} /></Ctrl>
        <span className="min-w-[72px] text-center text-[13px] tabular-nums text-white/55">{i + 1} / {total}</span>
        <Ctrl onClick={() => setI((p) => Math.min(total - 1, p + 1))} disabled={i === total - 1}><ChevronRight size={18} /></Ctrl>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className={`ml-2 flex items-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] transition ${showNotes ? "border-[#1a26ff]/50 bg-[#1a26ff]/15 text-[#4254ff]" : "border-white/10 text-white/55 hover:text-white/85"}`}
        >
          <StickyNote size={14} /> Notes
        </button>
        <button onClick={onClose} className="ml-2 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[12.5px] text-white/55 transition hover:text-white/85">
          <X size={14} /> Exit
        </button>
      </div>
    </div>
  );
}

function Ctrl({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] disabled:opacity-30">
      {children}
    </button>
  );
}
