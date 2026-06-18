"use client";

import { useEffect, useState } from "react";
import {
  X, Loader2, Check, ExternalLink, Copy, CloudUpload, Hash, AlertTriangle, ArrowUpRight, Link2,
} from "lucide-react";
import { renderPdfBase64 } from "@/lib/export-client";

type Result = {
  driveUrl?: string;
  slack?: { posted: boolean; channel?: string; error?: string };
};

type CorsairStatus = {
  configured: boolean;
  instanceName?: string;
  tenantId?: string;
  capabilities?: { research?: boolean; drive?: boolean; slack?: boolean };
  connectUrl?: string;
  error?: string | null;
};

export function PublishPanel({
  title,
  getNodes,
  onClose,
}: {
  title: string;
  getNodes: () => HTMLElement[];
  onClose: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signInLink, setSignInLink] = useState<string | null>(null);
  const [status, setStatus] = useState<CorsairStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/corsair/status?connect=1")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ configured: false }));
  }, []);

  async function publish() {
    setBusy(true);
    setError(null);
    setSignInLink(null);
    setResult(null);
    try {
      setStage("Rendering PDF…");
      const pdfBase64 = await renderPdfBase64(getNodes());

      setStage(channel ? "Uploading to Drive & posting to Slack…" : "Uploading to Google Drive…");
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, pdfBase64, channel: channel.trim(), message: message.trim() }),
      });

      const text = await res.text();
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response. Try again or check Corsair configuration.");
      }

      if (!json.ok) {
        setError((json.error as string) || "Publish failed.");
        if (json.needsAuth && json.signInLink) setSignInLink(json.signInLink as string);
        return;
      }
      setResult({ driveUrl: json.driveUrl as string, slack: json.slack as Result["slack"] });
    } catch (e) {
      setError((e as Error).message || "Publish failed.");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  function copy() {
    if (!result?.driveUrl) return;
    navigator.clipboard?.writeText(result.driveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const configured = status?.configured;
  const connectUrl = signInLink ?? status?.connectUrl;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-edge bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/15 text-brand">
              <CloudUpload size={16} />
            </span>
            <div>
              <h2 className="text-[15px] font-medium text-white">Publish &amp; share</h2>
              <p className="text-[12px] text-body">Drive → shareable link → Slack, via Corsair</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {configured === false ? (
            <Notice>
              Connect Corsair to publish. Set <code className="text-brand">CORSAIR_DEV_KEY</code> and{" "}
              <code className="text-brand">CORSAIR_INSTANCE_ID</code> (the opaque instance id from{" "}
              <a href="https://app.corsair.dev/dashboard" target="_blank" rel="noreferrer" className="text-brand underline">
                app.corsair.dev
              </a>
              ), then install <b>googledrive</b> and optionally <b>slack</b>.
            </Notice>
          ) : result ? (
            <Success result={result} title={title} onCopy={copy} copied={copied} />
          ) : (
            <>
              {status?.instanceName && (
                <p className="mb-3 text-[12px] text-muted">
                  Instance <span className="text-body">{status.instanceName}</span>
                  {status.tenantId && <> · tenant <span className="text-body">{status.tenantId}</span></>}
                  {status.capabilities?.drive === false && (
                    <span className="ml-2 text-err">· Drive plugin not installed</span>
                  )}
                </p>
              )}

              <p className="mb-4 text-[13.5px] leading-relaxed text-body">
                We&apos;ll upload <b className="text-white">{title}</b> as a PDF to your Google Drive,
                make it shareable by link, and (optionally) drop that link into Slack.
              </p>

              {connectUrl && (
                <a
                  href={connectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-4 flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2.5 text-[13px] text-brand transition hover:bg-brand/15"
                >
                  <Link2 size={14} />
                  Connect Google Drive {status?.capabilities?.slack ? "& Slack" : ""}
                  <ArrowUpRight size={12} className="ml-auto" />
                </a>
              )}

              <label className="mb-1.5 block text-[12px] font-medium text-body">
                Slack channel <span className="text-muted">(optional; requires slack plugin)</span>
              </label>
              <div className="mb-4 flex items-center gap-2 rounded-md border border-edge bg-ink-2 px-3">
                <Hash size={14} className="text-muted" />
                <input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value.replace(/^#/, ""))}
                  placeholder="team-updates"
                  disabled={!status?.capabilities?.slack}
                  className="h-10 flex-1 bg-transparent text-[14px] text-white placeholder:text-muted focus:outline-none disabled:opacity-40"
                />
              </div>

              {channel && (
                <>
                  <label className="mb-1.5 block text-[12px] font-medium text-body">Message <span className="text-muted">(optional)</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="Fresh off the press, feedback welcome."
                    className="mb-4 w-full resize-none rounded-md border border-edge bg-ink-2 px-3 py-2 text-[14px] text-white placeholder:text-muted focus:outline-none"
                  />
                </>
              )}

              {(error || status?.error) && (
                <div className="mb-4 rounded-md border border-err/30 bg-err/10 p-3 text-[12.5px] text-[#ff8a8a]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <div>
                      {error || status?.error}
                      {signInLink && (
                        <a href={signInLink} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 font-medium text-white underline">
                          Connect the account <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={publish}
                disabled={busy || status?.capabilities?.drive === false}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-active disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                {busy ? stage || "Publishing…" : channel ? "Publish & post to Slack" : "Publish to Drive"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Success({ result, title, onCopy, copied }: { result: Result; title: string; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-[14px] font-medium text-ok">
        <Check size={16} /> Published
      </div>

      <Step ok label="Uploaded to Google Drive" sub={`${title}.pdf · shareable by link`} />
      <div className="my-3 flex items-center gap-2 rounded-md border border-edge bg-ink-2 px-3 py-2">
        <input readOnly value={result.driveUrl ?? ""} className="flex-1 truncate bg-transparent text-[12.5px] text-body focus:outline-none" />
        <button onClick={onCopy} title="Copy link" className="text-muted transition hover:text-white">
          {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
        </button>
        <a href={result.driveUrl} target="_blank" rel="noreferrer" className="text-muted transition hover:text-white">
          <ExternalLink size={14} />
        </a>
      </div>

      {result.slack?.posted ? (
        <Step ok label={`Posted to #${result.slack.channel}`} sub="Link shared with the channel" />
      ) : result.slack?.error ? (
        <Step ok={false} label={`Slack: ${result.slack.channel ? `#${result.slack.channel}` : "skipped"}`} sub={result.slack.error} />
      ) : (
        <Step ok label="Slack" sub="Skipped: no channel given" muted />
      )}
    </div>
  );
}

function Step({ ok, label, sub, muted }: { ok: boolean; label: string; sub?: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-ok/20 text-ok" : "bg-err/20 text-err"}`}>
        {ok ? <Check size={11} /> : <X size={11} />}
      </span>
      <div>
        <div className={`text-[13px] ${muted ? "text-muted" : "text-white"}`}>{label}</div>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-edge bg-ink-2 p-4 text-[13px] leading-relaxed text-body">
      {children}
    </div>
  );
}
