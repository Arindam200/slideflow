import { NextResponse } from "next/server";
import { generateSlideImage, imageEnabled } from "@/lib/image";
import { buildImagePrompt, aspectFor } from "@/lib/image-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET → whether image generation is available (drives the client UI). */
export async function GET() {
  return NextResponse.json({ enabled: imageEnabled() });
}

/** POST → generate one slide image from its title/visual/mood. */
export async function POST(req: Request) {
  if (!imageEnabled()) {
    return NextResponse.json({ ok: false, error: "Image generation not configured." });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.slice(0, 300) : undefined;
  const visual = typeof body?.visual === "string" ? body.visual.slice(0, 200) : undefined;
  const mood = typeof body?.mood === "string" ? body.mood.slice(0, 120) : undefined;
  const layout = typeof body?.layout === "string" ? body.layout : undefined;

  if (!title && !visual) {
    return NextResponse.json({ ok: false, error: "Nothing to illustrate." }, { status: 400 });
  }

  try {
    const dataUrl = await generateSlideImage(
      buildImagePrompt({ title, visual, mood, layout }),
      aspectFor(layout),
    );
    if (!dataUrl) return NextResponse.json({ ok: false, error: "No image returned." });
    return NextResponse.json({ ok: true, dataUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message || "Image generation failed." },
      { status: 500 },
    );
  }
}
