"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileType, Check, Loader2, ChevronDown } from "lucide-react";
import type { Deck } from "@/lib/deck";
import type { Theme } from "@/lib/themes";
import { exportPdf, exportPptx } from "@/lib/export-client";

export function ExportMenu({
  deck,
  theme,
  getNodes,
}: {
  deck: Deck;
  theme: Theme;
  getNodes: () => HTMLElement[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fileBase =
    deck.title?.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "deck";

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      setDone(id);
      setTimeout(() => setDone(null), 1800);
    } catch (e) {
      setErr((e as Error).message || "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-edge bg-panel-2 px-3.5 py-2 text-[13.5px] font-medium text-white transition hover:border-edge-strong"
      >
        <Download size={15} /> Export <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 animate-float-up overflow-hidden rounded-lg border border-edge bg-panel p-1.5">
          <div className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
            Download
          </div>
          <Item
            icon={<FileText size={16} />}
            label="PDF"
            hint="vector-crisp slides"
            busy={busy === "pdf"}
            done={done === "pdf"}
            onClick={() => run("pdf", () => exportPdf(getNodes(), fileBase))}
          />
          <Item
            icon={<FileType size={16} />}
            label="PowerPoint (.pptx)"
            hint="fully editable"
            busy={busy === "pptx"}
            done={done === "pptx"}
            onClick={() => run("pptx", () => exportPptx(deck, theme, fileBase))}
          />
          {err && (
            <div className="m-1.5 rounded-md border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-3 py-2 text-[12px] text-[#ff8a8a]">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Item({
  icon, label, hint, onClick, busy, done,
}: {
  icon: React.ReactNode; label: string; hint?: string; onClick: () => void; busy?: boolean; done?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-panel-2 disabled:opacity-60"
    >
      <span className="text-muted">
        {busy ? <Loader2 size={16} className="animate-spin" /> : done ? <Check size={16} className="text-[#33d17a]" /> : icon}
      </span>
      <span className="flex-1">
        <span className="block text-[13.5px] text-white">{label}</span>
        {hint && <span className="block text-[11.5px] text-muted">{hint}</span>}
      </span>
    </button>
  );
}
