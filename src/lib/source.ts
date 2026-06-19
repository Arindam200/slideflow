import "server-only";
import { getCorsair, scopedTenant, ensureTenant, OPS } from "@/lib/corsair";

/**
 * Import a user's existing document from Google Drive (via Corsair) and turn it
 * into grounding text for the deck generator. This is the input-side mirror of
 * `research.ts`: instead of pulling live web facts, we pull the user's own
 * source material through the same `tenant.run(op)` integration layer.
 */

export type SourceResult = {
  available: boolean;
  title?: string;
  mimeType?: string;
  text?: string;
  reason?: string;
};

/** Cap grounding so we never blow the model's context with a huge document. */
const MAX_SOURCE_CHARS = 8000;

/**
 * Pull a Drive/Docs file id out of a pasted URL, or accept a raw id.
 * Handles docs/sheets/slides URLs, drive file URLs, and `?id=` forms.
 */
export function parseDriveFileId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // .../d/<id>/...  (docs, sheets, slides, drive file)
  const pathMatch = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (pathMatch) return pathMatch[1];

  // ...?id=<id> or &id=<id>
  const queryMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (queryMatch) return queryMatch[1];

  // A bare file id pasted on its own.
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;

  return null;
}

/** Ground a deck in a user-owned Drive document, read as the visitor's tenant. */
export async function gatherSource(input: string, tenantId: string): Promise<SourceResult> {
  const fileId = parseDriveFileId(input);
  if (!fileId) return { available: false, reason: "bad_url" };

  const ctx = await getCorsair();
  if (!ctx) return { available: false, reason: "not_configured" };

  await ensureTenant(ctx, tenantId);
  const t = scopedTenant(ctx, tenantId);

  // Metadata first — gives us a title and lets us detect native Google formats
  // (Docs/Sheets/Slides), which need an export rather than a raw download.
  let title: string | undefined;
  let mimeType: string | undefined;
  try {
    const meta = await t.run<{ name?: string; mimeType?: string }>(OPS.driveGet, { fileId });
    if (meta.success) {
      title = meta.data?.name;
      mimeType = meta.data?.mimeType;
    } else if (meta.signInLink) {
      return { available: false, reason: "needs_auth" };
    }
  } catch {
    /* metadata is best-effort; continue to the download attempt */
  }

  try {
    const dl = await t.run<unknown>(OPS.driveDownload, { fileId });
    if (!dl.success) {
      return { available: false, reason: dl.signInLink ? "needs_auth" : "download_failed" };
    }
    const text = normalizeDriveContent(dl.data);
    if (!text.trim()) {
      // Native Google Docs/Sheets often return nothing from a raw download.
      const reason = mimeType?.startsWith("application/vnd.google-apps")
        ? "needs_export"
        : "empty";
      return { available: false, title, mimeType, reason };
    }
    return {
      available: true,
      title,
      mimeType,
      text: text.slice(0, MAX_SOURCE_CHARS),
    };
  } catch {
    return { available: false, title, mimeType, reason: "download_failed" };
  }
}

/**
 * The download op's payload shape is loosely typed. Accept a plain string, or
 * an object carrying the bytes under a common field, decoding base64 to UTF-8
 * when the content isn't already readable text.
 */
export function normalizeDriveContent(data: unknown): string {
  if (typeof data === "string") return decodeMaybeBase64(data);
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const field = obj.content ?? obj.data ?? obj.body ?? obj.fileContent ?? obj.text;
    if (typeof field === "string") return decodeMaybeBase64(field);
  }
  return "";
}

const BASE64_RE = /^[A-Za-z0-9+/\r\n]+={0,2}$/;

function decodeMaybeBase64(value: string): string {
  const trimmed = value.trim();
  // Heuristic: long, base64-alphabet-only strings are encoded bytes.
  if (trimmed.length > 16 && trimmed.length % 4 === 0 && BASE64_RE.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
      // Reject binary blobs that decoded into mostly control characters.
      if (decoded && isMostlyText(decoded)) return decoded;
    } catch {
      /* fall through to raw value */
    }
  }
  return value;
}

function isMostlyText(s: string): boolean {
  const sample = s.slice(0, 2000);
  let printable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) printable++;
  }
  return sample.length === 0 || printable / sample.length > 0.85;
}
