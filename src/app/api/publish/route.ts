import { NextResponse } from "next/server";
import { getCorsair, tenant, OPS, DRIVE_CONTENT_FIELD, formatCorsairError } from "@/lib/corsair";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await getCorsair();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, error: "Corsair isn't configured. Set CORSAIR_DEV_KEY + CORSAIR_INSTANCE_ID." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const pdfBase64 = typeof body?.pdfBase64 === "string" ? body.pdfBase64.replace(/^data:[^;]+;base64,/, "") : "";
  const title = (typeof body?.title === "string" && body.title.trim()) || "Untitled deck";
  const channel = typeof body?.channel === "string" ? body.channel.trim() : "";
  const note = typeof body?.message === "string" ? body.message.trim() : "";
  if (!pdfBase64) {
    return NextResponse.json({ ok: false, error: "Missing deck PDF." }, { status: 400 });
  }

  const t = tenant(ctx);
  const fileName = `${title.replace(/[^\w\s-]/g, "").trim() || "deck"}.pdf`;

  let fileId: string | undefined;
  let driveUrl: string | undefined;
  try {
    const up = await t.run<{ id?: string; webViewLink?: string }>(OPS.driveUpload, {
      name: fileName,
      mimeType: "application/pdf",
      [DRIVE_CONTENT_FIELD]: pdfBase64,
    });
    if (!up.success) return needsAuth(up, "Google Drive");
    fileId = up.data?.id;
    driveUrl = up.data?.webViewLink;
  } catch (e) {
    return fail(formatCorsairError(e));
  }
  if (!fileId) return fail("Drive upload returned no file id.");

  try {
    await t.run(OPS.driveShare, { fileId, type: "anyone", role: "reader" });
  } catch {
    /* non-fatal */
  }
  driveUrl ??= `https://drive.google.com/file/d/${fileId}/view`;

  let slack: { posted: boolean; channel?: string; error?: string } = { posted: false };
  if (channel) {
    try {
      const text =
        `:bar_chart: *${title}* is ready to view.\n` +
        (note ? `${note}\n` : "") +
        `<${driveUrl}|Open the deck>`;
      const res = await t.run(OPS.slackPost, { channel, text, mrkdwn: true, unfurl_links: false });
      slack = res.success
        ? { posted: true, channel }
        : { posted: false, channel, error: "Slack isn't connected. Use the connect link to authorize Slack." };
    } catch (e) {
      slack = { posted: false, channel, error: formatCorsairError(e) };
    }
  }

  return NextResponse.json({ ok: true, driveUrl, slack });
}

function needsAuth(res: { signInLink?: string }, label: string) {
  return NextResponse.json({
    ok: false,
    needsAuth: true,
    signInLink: res.signInLink,
    error: `${label} isn't connected yet. Use the connect link to authorize your account.`,
  });
}

function fail(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 500 });
}
