"use client";

import { useRouter } from "next/navigation";
import { Telescope, Wand2, Presentation, FileDown, Sparkles, Star } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Composer } from "@/components/Composer";
import { TerminalMockup } from "@/components/TerminalMockup";
import { stashRequest } from "@/lib/store";
import { GITHUB_REPO } from "@/lib/site";
import type { GenerateRequest } from "@/lib/deck";

export default function Home() {
  const router = useRouter();

  function start(req: GenerateRequest) {
    stashRequest(req);
    router.push("/studio");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink">
      <div className="hero-aurora pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <div className="grain pointer-events-none absolute inset-0" />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-edge bg-panel px-3.5 py-2 text-[13px] font-medium text-body transition hover:border-edge-strong hover:text-white"
        >
          <Star size={14} className="text-brand-2" />
          Star the repo
        </a>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-12 text-center">
        <div className="badge-pill mb-6 inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px] shadow-brand-2" />
          AI decks · grounded in your tools
        </div>
        <h1 className="text-balance text-[clamp(2.25rem,5.3vw,4.35rem)] font-medium leading-[1.08] tracking-[-0.03em] text-white">
          From a sentence to a
          <br />
          <span className="text-brand">stunning deck</span>, fast.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-[clamp(0.875rem,1.55vw,1.0625rem)] leading-relaxed text-body sm:whitespace-nowrap">
          Describe an idea, watch slides stream in, then publish to Drive and Slack through Corsair.
        </p>
      </section>

      <section className="relative z-10 mx-auto mt-14 max-w-3xl px-6">
        <Composer onSubmit={start} />
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-5xl px-6">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Live generation</p>
          <h2 className="mt-2 text-[24px] font-medium tracking-[-0.02em] text-white">Watch the deck build itself</h2>
        </div>
        <TerminalMockup />
      </section>

      <section className="relative z-10 mx-auto mt-24 max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Wand2 size={18} />} title="Streamed, not stalled" body="Slides appear live as the model writes them, no spinner-and-pray." />
          <Feature icon={<Telescope size={18} />} title="Grounded in facts" body="Optional live research via Corsair's web plugins before a word is written." />
          <Feature icon={<Presentation size={18} />} title="Presenter-ready" body="Designer themes, speaker notes, and a fullscreen present mode." />
          <Feature icon={<FileDown size={18} />} title="Publish & share" body="One click: PDF to Google Drive, shareable link dropped into Slack via Corsair." />
        </div>
      </section>

      <section className="relative z-10 border-t border-edge-soft px-6 py-24">
        <div className="hero-aurora pointer-events-none absolute inset-x-0 top-0 h-full opacity-60" />
        <div className="relative mx-auto max-w-2xl text-center">
          <Sparkles size={28} className="mx-auto mb-5 text-brand" />
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.02em] text-white">
            Ready to present?
          </h2>
          <p className="mt-4 text-[16px] text-body">Start with a sentence. Leave with a deck.</p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="feature-card rounded-xl border border-edge bg-panel p-7 transition hover:border-edge-strong">
      <div className="toolkit-icon mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-edge-strong bg-panel-2 text-brand">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-body">{body}</p>
    </div>
  );
}
