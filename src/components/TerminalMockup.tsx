"use client";

import { useEffect, useState } from "react";

const PANES = [
  {
    label: "stream",
    lines: [
      { t: "prompt", c: "text-brand-2" },
      { t: '"Q3 investor update: growth, burn, milestones"', c: "text-white/90" },
      { t: "→ streamObject(DeckSchema)", c: "text-body" },
      { t: "✓ slide 1/8 · cover", c: "text-ok" },
      { t: "✓ slide 2/8 · section", c: "text-ok" },
      { t: "▸ slide 3/8 · bullets…", c: "text-brand" },
    ],
  },
  {
    label: "layout",
    lines: [
      { t: "cover", c: "text-brand-2" },
      { t: "title: Q3 Investor Update", c: "text-white/85" },
      { t: "subtitle: Momentum at scale", c: "text-body" },
      { t: "", c: "" },
      { t: "section · stat · quote", c: "text-muted" },
      { t: "timeline · closing", c: "text-muted" },
    ],
  },
  {
    label: "theme",
    lines: [
      { t: "theme: corsair", c: "text-brand-2" },
      { t: "canvas  #0f0f0f", c: "text-body" },
      { t: "accent  #0007cd", c: "text-brand" },
      { t: "font    Inter 500", c: "text-body" },
      { t: "art     spotlight glow", c: "text-muted" },
    ],
  },
  {
    label: "export",
    lines: [
      { t: "present → fullscreen", c: "text-white/85" },
      { t: "export  → PDF · PPTX", c: "text-body" },
      { t: "share   → Drive + Slack", c: "text-body" },
      { t: "", c: "" },
      { t: "via Corsair integrations", c: "text-muted" },
    ],
  },
];

export function TerminalMockup() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const activePane = tick % 4;

  return (
    <div className="terminal-grid mx-auto w-full max-w-4xl">
      <div className="terminal-grid-inner grid grid-cols-1 gap-4 p-8 sm:grid-cols-2">
        {PANES.map((pane, i) => (
          <div
            key={pane.label}
            className={`terminal-pane rounded-lg p-5 transition duration-500 ${
              i === activePane ? "ring-1 ring-brand-2/40" : ""
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-edge-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-edge-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-edge-strong" />
              </span>
              <span className="ml-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {pane.label}
              </span>
            </div>
            <pre className="font-mono text-[12.5px] leading-[1.65]">
              {pane.lines.map((line, j) => (
                <div key={j} className={line.c || "text-transparent"}>
                  {line.t || "\u00a0"}
                </div>
              ))}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
