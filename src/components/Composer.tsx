"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Telescope,
  Loader2,
  ChevronDown,
  Presentation,
  Palette,
  Users,
  Check,
  FileUp,
} from "lucide-react";
import { TONES, type GenerateRequest, type Tone } from "@/lib/deck";
import { THEMES, DEFAULT_THEME_ID } from "@/lib/themes";

const EXAMPLES = [
  { label: "Series A pitch", prompt: "Series A pitch for an AI logistics startup" },
  { label: "4-day work week", prompt: "The case for a 4-day work week" },
  { label: "Q3 GTM plan", prompt: "Q3 go-to-market strategy for our SaaS" },
  { label: "Transformers 101", prompt: "How transformers actually work, for engineers" },
];

type MenuId = "slides" | "tone" | "theme" | "audience" | "source";

export function Composer({
  onSubmit,
  busy = false,
  initial,
  compact = false,
}: {
  onSubmit: (req: GenerateRequest) => void;
  busy?: boolean;
  initial?: Partial<GenerateRequest>;
  compact?: boolean;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [slideCount, setSlideCount] = useState(initial?.slideCount ?? 8);
  const [tone, setTone] = useState<Tone>(initial?.tone ?? "Professional");
  const [themeId, setThemeId] = useState(initial?.themeId ?? DEFAULT_THEME_ID);
  const [research, setResearch] = useState(initial?.research ?? true);
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [driveAvailable, setDriveAvailable] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const canSubmit = prompt.trim().length > 3 && !busy;
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    let active = true;
    fetch("/api/corsair/status")
      .then((r) => r.json())
      .then((s) => {
        if (active) setDriveAvailable(Boolean(s?.capabilities?.drive));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    function onClick(e: MouseEvent) {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenu]);

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      prompt: prompt.trim(),
      audience: audience.trim() || undefined,
      slideCount,
      tone,
      themeId,
      research,
      sourceUrl: driveAvailable && sourceUrl.trim() ? sourceUrl.trim() : undefined,
    });
  }

  function toggleMenu(id: MenuId) {
    setOpenMenu((cur) => (cur === id ? null : id));
  }

  return (
    <div ref={shellRef} className="composer-shell mx-auto w-full">
      <div className="composer-input rounded-2xl border border-edge bg-panel-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Describe your presentation…"
          rows={compact ? 1 : 2}
          className="block w-full resize-none rounded-t-2xl bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed text-white placeholder:text-muted focus:outline-none"
        />

        <div className="flex items-center gap-1 px-3 pb-3 pt-1">
          <ToolbarMenu
            open={openMenu === "slides"}
            onToggle={() => toggleMenu("slides")}
            label={`${slideCount} slides`}
            icon={<Presentation size={14} />}
          >
              <div className="max-h-48 overflow-y-auto p-1">
                {Array.from({ length: 14 }, (_, i) => i + 3).map((n) => (
                  <MenuOption
                    key={n}
                    active={slideCount === n}
                    onClick={() => {
                      setSlideCount(n);
                      setOpenMenu(null);
                    }}
                  >
                    {n} slides
                  </MenuOption>
                ))}
              </div>
            </ToolbarMenu>

            <ToolbarMenu
              open={openMenu === "tone"}
              onToggle={() => toggleMenu("tone")}
              label={tone}
              icon={<Sparkles size={14} />}
            >
              <div className="p-1">
                {TONES.map((t) => (
                  <MenuOption
                    key={t}
                    active={tone === t}
                    onClick={() => {
                      setTone(t);
                      setOpenMenu(null);
                    }}
                  >
                    {t}
                  </MenuOption>
                ))}
              </div>
            </ToolbarMenu>

            <ToolbarMenu
              open={openMenu === "theme"}
              onToggle={() => toggleMenu("theme")}
              label={theme.name}
              icon={<Palette size={14} />}
            >
              <div className="grid grid-cols-2 gap-1 p-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setThemeId(t.id);
                      setOpenMenu(null);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition ${
                      themeId === t.id ? "bg-panel-2 text-white" : "text-body hover:bg-panel-2/80 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }}
                    />
                    <span className="truncate">{t.name}</span>
                    {themeId === t.id && <Check size={12} className="ml-auto shrink-0 text-brand-2" />}
                  </button>
                ))}
              </div>
            </ToolbarMenu>

            {!compact && (
              <ToolbarMenu
                open={openMenu === "audience"}
                onToggle={() => toggleMenu("audience")}
                label={audience.trim() ? audience.trim() : "Audience"}
                icon={<Users size={14} />}
                muted={!audience.trim()}
              >
                <div className="p-2">
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. investors, board, engineers"
                    className="w-full rounded-lg border border-edge bg-ink-2 px-3 py-2 text-[13px] text-white placeholder:text-muted focus:border-edge-strong focus:outline-none"
                    autoFocus
                  />
                </div>
              </ToolbarMenu>
          )}

          {driveAvailable && (
            <ToolbarMenu
              open={openMenu === "source"}
              onToggle={() => toggleMenu("source")}
              label={sourceUrl.trim() ? "Drive doc" : "Import"}
              icon={<FileUp size={14} />}
              muted={!sourceUrl.trim()}
            >
              <div className="w-64 p-2">
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setOpenMenu(null);
                  }}
                  placeholder="Paste a Google Drive / Docs link"
                  className="w-full rounded-lg border border-edge bg-ink-2 px-3 py-2 text-[13px] text-white placeholder:text-muted focus:border-edge-strong focus:outline-none"
                  autoFocus
                />
                <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-muted">
                  Build the deck from your own document, imported via Corsair.
                </p>
              </div>
            </ToolbarMenu>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
            <button
              type="button"
              onClick={() => setResearch((r) => !r)}
              title={research ? "Live research on" : "Live research off"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                research ? "text-brand-2" : "text-muted hover:bg-panel-3 hover:text-white"
              }`}
            >
              <Telescope size={17} strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition enabled:hover:bg-brand-active disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} strokeWidth={1.75} />}
              <span className="hidden sm:inline">{busy ? "Generating" : "Generate"}</span>
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setPrompt(ex.prompt)}
              className="rounded-full border border-edge bg-panel/80 px-3.5 py-1.5 text-[12.5px] text-body transition hover:border-edge-strong hover:bg-panel-2 hover:text-white"
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarMenu({
  open,
  onToggle,
  label,
  icon,
  muted,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] transition ${
          open
            ? "bg-panel-3 text-white"
            : muted
              ? "text-muted hover:bg-panel-3 hover:text-body"
              : "text-body hover:bg-panel-3 hover:text-white"
        }`}
      >
        <span className="shrink-0 opacity-70">{icon}</span>
        <span className="max-w-[5.5rem] truncate sm:max-w-[6.5rem]">{label}</span>
        <ChevronDown size={11} className={`shrink-0 opacity-50 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="composer-menu absolute left-0 top-full z-50 mt-1.5 min-w-[10.5rem] animate-float-up rounded-xl border border-edge bg-panel-3 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function MenuOption({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition ${
        active ? "bg-panel-2 text-white" : "text-body hover:bg-panel-2/80 hover:text-white"
      }`}
    >
      {children}
      {active && <Check size={13} className="text-brand-2" />}
    </button>
  );
}
