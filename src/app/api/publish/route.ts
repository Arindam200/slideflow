import { NextResponse } from "next/server";
import {
  getCorsair,
  scopedTenant,
  ensureTenant,
  isDriveConnected,
  OPS,
  DRIVE_CONTENT_FIELD,
  formatCorsairError,
  isPublishDisabled,
} from "@/lib/corsair";
import { readVisitorTenantId, newVisitorTenantId, setVisitorCookie } from "@/lib/visitor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (isPublishDisabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Publish & Share is turned off on this deployment (PUBLIC_DEMO).",
      },
      { status: 403 },
    );
  }

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
  if (!pdfBase64) {
    return NextResponse.json({ ok: false, error: "Missing deck PDF." }, { status: 400 });
  }

  // This visitor's own tenant — the deck lands in *their* Drive, not the owner's.
  let tenantId = readVisitorTenantId(req);
  let mintedCookie = false;
  if (!tenantId) {
    tenantId = newVisitorTenantId();
    mintedCookie = true;
  }
  await ensureTenant(ctx, tenantId);

  const cookie = (res: NextResponse) => (mintedCookie ? (setVisitorCookie(res, tenantId!), res) : res);

  // Require the visitor to have connected their Google account first.
  if (!(await isDriveConnected(ctx, tenantId))) {
    let signInLink: string | undefined;
    try {
      const link = await scopedTenant(ctx, tenantId).connectLink.create({ plugins: ["googledrive"] });
      signInLink = link.url;
    } catch {
      /* surfaced below without a link */
    }
    return cookie(
      NextResponse.json({
        ok: false,
        needsAuth: true,
        signInLink,
        error: "Connect your Google Drive to publish, then try again.",
      }),
    );
  }

  const t = scopedTenant(ctx, tenantId);
  const fileName = `${title.replace(/[^\w\s-]/g, "").trim() || "deck"}.pdf`;

  let fileId: string | undefined;
  let driveUrl: string | undefined;
  try {
    const up = await t.run<{ id?: string; webViewLink?: string }>(OPS.driveUpload, {
      name: fileName,
      mimeType: "application/pdf",
      [DRIVE_CONTENT_FIELD]: pdfBase64,
    });
    if (!up.success) {
      return cookie(NextResponse.json({
        ok: false,
        needsAuth: true,
        signInLink: up.signInLink,
        error: "Google Drive isn't connected yet. Use the connect link to authorize your account.",
      }));
    }
    fileId = up.data?.id;
    driveUrl = up.data?.webViewLink;
  } catch (e) {
    return cookie(NextResponse.json({ ok: false, error: formatCorsairError(e) }, { status: 500 }));
  }
  if (!fileId) {
    return cookie(NextResponse.json({ ok: false, error: "Drive upload returned no file id." }, { status: 500 }));
  }

  try {
    await t.run(OPS.driveShare, { fileId, type: "anyone", role: "reader" });
  } catch {
    /* non-fatal */
  }
  driveUrl ??= `https://drive.google.com/file/d/${fileId}/view`;

  return cookie(NextResponse.json({ ok: true, driveUrl }));
}
