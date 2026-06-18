import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { normalizeSlide, type Deck, type Slide } from "./deck";
import type { Theme } from "./themes";

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

async function snapshot(node: HTMLElement): Promise<string> {
  return toPng(node, {
    width: SLIDE_W,
    height: SLIDE_H,
    pixelRatio: 2,
    // cacheBust would rewrite resource URLs; leave off so inline data-URL
    // images (generated slide art) embed cleanly.
    cacheBust: false,
    // Render at true design size regardless of on-screen scale.
    style: { transform: "none", margin: "0", inset: "auto" },
  });
}

/** Render slide nodes into a landscape PDF document. */
async function buildPdf(nodes: HTMLElement[]): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [SLIDE_W, SLIDE_H] });
  for (let i = 0; i < nodes.length; i++) {
    const data = await snapshot(nodes[i]);
    if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], "landscape");
    pdf.addImage(data, "PNG", 0, 0, SLIDE_W, SLIDE_H);
  }
  return pdf;
}

/** Export an array of full-size slide DOM nodes to a single landscape PDF. */
export async function exportPdf(nodes: HTMLElement[], filename: string) {
  const pdf = await buildPdf(nodes);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Render the same PDF but return raw base64 (no data: prefix) for upload. */
export async function renderPdfBase64(nodes: HTMLElement[]): Promise<string> {
  const pdf = await buildPdf(nodes);
  const uri = pdf.output("datauristring");
  return uri.slice(uri.indexOf(",") + 1);
}

/** Export a single slide node to a PNG download. */
export async function exportPng(node: HTMLElement, filename: string) {
  const data = await snapshot(node);
  const a = document.createElement("a");
  a.href = data;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}

/** Build a native .pptx from deck data + theme (text-based, fully editable). */
export async function exportPptx(deck: Deck, theme: Theme, filename: string) {
  const PptxGen = (await import("pptxgenjs")).default;
  const pptx = new PptxGen();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";

  const bg = hex(theme.bg);
  const fg = hex(theme.fg);
  const muted = hexAlpha(theme.muted, theme.dark ? "B8C0E0" : "475569");
  const accent = hex(theme.accent);

  deck.slides.forEach((raw) => {
    if (!raw.title?.trim()) return;
    const s = normalizeSlide(raw) as Slide;
    const slide = pptx.addSlide();
    slide.background = { color: bg };

    // Accent rule near the top, echoing the on-screen layouts.
    slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 0.55, w: 0.9, h: 0.07, fill: { color: accent } });

    slide.addText(s.title, {
      x: 0.6, y: 0.7, w: 12.1, h: s.layout === "cover" ? 2.4 : 1.3,
      fontSize: s.layout === "cover" ? 44 : 30, bold: true, color: fg,
      fontFace: "Arial", valign: "top",
    });

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.6, y: 2.2, w: 12.1, h: 0.8, fontSize: 18, color: muted, fontFace: "Arial",
      });
    }

    const lines: { text: string; options?: object }[] = [];
    if (s.body) lines.push({ text: s.body, options: { fontSize: 18, color: fg, paraSpaceAfter: 10 } });
    if (s.quote) lines.push({ text: `“${s.quote}”`, options: { fontSize: 24, italic: true, color: fg } });
    if (s.attribution) lines.push({ text: `- ${s.attribution}`, options: { fontSize: 14, color: muted } });
    for (const b of s.bullets ?? []) {
      lines.push({ text: b.text + (b.detail ? ` - ${b.detail}` : ""), options: { fontSize: 16, color: fg, bullet: true } });
    }
    for (const c of s.columns ?? []) {
      lines.push({ text: c.heading, options: { fontSize: 18, bold: true, color: accent, paraSpaceBefore: 8 } });
      for (const b of c.bullets) lines.push({ text: b, options: { fontSize: 15, color: fg, bullet: true, indentLevel: 1 } });
    }
    for (const st of s.stats ?? []) {
      lines.push({ text: st.value, options: { fontSize: 40, bold: true, color: accent } });
      lines.push({ text: st.label, options: { fontSize: 14, color: muted, paraSpaceAfter: 12 } });
    }
    (s.steps ?? []).forEach((step, i) =>
      lines.push({ text: `${i + 1}. ${step.title} - ${step.description}`, options: { fontSize: 15, color: fg, paraSpaceAfter: 6 } }),
    );

    if (lines.length) {
      slide.addText(lines as never, {
        x: 0.6, y: s.subtitle ? 3.0 : 2.3, w: 12.1, h: 4.0, valign: "top", fontFace: "Arial",
      });
    }

    if (s.notes) slide.addNotes(s.notes);
  });

  await pptx.writeFile({ fileName: filename.endsWith(".pptx") ? filename : `${filename}.pptx` });
}

function hex(c: string): string {
  if (c.startsWith("#")) return c.slice(1);
  return "0b0d16";
}
function hexAlpha(_c: string, fallback: string): string {
  return fallback;
}
