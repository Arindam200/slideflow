"use client";

import { useEffect, useRef, useState } from "react";
import { SLIDE_W, SLIDE_H } from "@/lib/export-client";

/**
 * Scales a fixed 1280×720 slide to fit its container while preserving 16:9.
 * The outer box uses aspect-ratio so the unscaled 720px inner node never
 * blows out layout (CSS transform does not shrink document flow).
 */
export function SlideStage({
  children,
  className = "",
  maxWidth,
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(el.clientWidth, maxWidth ?? Infinity);
      setScale(w > 0 ? w / SLIDE_W : 0.25);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: "100%",
        aspectRatio: `${SLIDE_W} / ${SLIDE_H}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
