"use client";

import { getTheme } from "@/lib/themes";
import { SLIDE_W, SLIDE_H } from "@/lib/export-client";

/** Placeholder slide shown while a slide is still streaming in. */
export function SlideSkeleton({ themeId, index }: { themeId: string; index: number }) {
  const theme = getTheme(themeId);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        background: theme.bg,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: theme.art }}
      />
      <div className="relative flex h-full flex-col justify-center px-[84px]">
        <div className="skeleton mb-6 h-3 w-24 rounded" />
        <div className="skeleton mb-4 h-10 w-[70%] rounded-md" />
        <div className="skeleton mb-3 h-5 w-[55%] rounded-md" />
        <div className="mt-8 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-7 w-7 shrink-0 rounded-md" />
              <div className="skeleton h-5 flex-1 rounded-md" style={{ maxWidth: `${320 - i * 40}px` }} />
            </div>
          ))}
        </div>
      </div>
      <span
        className="absolute bottom-10 right-[84px] font-mono text-[14px] tabular-nums"
        style={{ color: theme.muted }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}
