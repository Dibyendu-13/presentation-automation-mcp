import pptxgen from "pptxgenjs";
import type { DeckSpec } from "./types.js";

const themes = {
  midnight: { bg: "0B1020", text: "F7F8FC", muted: "A8B0C7", accent: "7C5CFC" },
  paper: { bg: "F5F1E8", text: "172033", muted: "5C6472", accent: "D8553C" },
};

export async function renderDeck(deck: DeckSpec, outputPath: string) {
  console.log("[renderer] Creating PowerPoint document", {
    title: deck.title,
    theme: deck.theme,
    slideCount: deck.slides.length,
  });
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PresentFlow";
  pptx.subject = deck.title;
  pptx.title = deck.title;
  pptx.company = "ContentBeta Assessment";
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "en-US",
  };
  const c = themes[deck.theme];

  for (const [index, item] of deck.slides.entries()) {
    console.log("[renderer] Building slide", {
      slideNumber: index + 1,
      type: item.type,
      title: item.title,
    });
    const slide = pptx.addSlide();
    slide.background = { color: c.bg };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: .18, h: 7.5, fill: { color: c.accent }, line: { color: c.accent } });
    slide.addText(String(index + 1).padStart(2, "0"), { x: 12.1, y: .35, w: .55, h: .3, fontSize: 10, color: c.muted, align: "right", margin: 0 });

    if (item.type === "title") {
      slide.addText(item.title, { x: .9, y: 2.15, w: 10.8, h: 1.5, fontSize: 34, bold: true, color: c.text, breakLine: false, margin: 0, valign: "mid" });
      if (item.subtitle) slide.addText(item.subtitle, { x: .92, y: 3.85, w: 9.3, h: .7, fontSize: 18, color: c.muted, margin: 0 });
      console.log("[renderer] Finished title slide", { slideNumber: index + 1 });
      continue;
    }

    slide.addText(item.title, { x: .85, y: .62, w: 10.9, h: .7, fontSize: 26, bold: true, color: c.text, margin: 0 });
    if (item.type === "two-column") {
      addBullets(slide, item.left || [], .9, 1.65, 5.4, c);
      slide.addShape(pptx.ShapeType.line, { x: 6.55, y: 1.7, w: 0, h: 4.6, line: { color: c.muted, transparency: 65, width: 1 } });
      addBullets(slide, item.right || [], 7.0, 1.65, 5.0, c);
    } else {
      addBullets(slide, item.bullets, .95, 1.7, 10.9, c);
    }
    console.log("[renderer] Finished slide", { slideNumber: index + 1 });
  }

  console.log("[renderer] Writing PPTX file", { outputPath });
  await pptx.writeFile({ fileName: outputPath });
  console.log("[renderer] PPTX file written", { outputPath });
}

function addBullets(slide: pptxgen.Slide, bullets: string[], x: number, y: number, w: number, c: typeof themes.midnight) {
  console.log("[renderer] Adding bullet content", { bulletCount: bullets.length });
  const runs = bullets.flatMap((text) => [
    { text, options: { bullet: { indent: 18 }, breakLine: true, hanging: 4 } },
  ]);
  slide.addText(runs, { x, y, w, h: 4.9, fontSize: 20, color: c.text, breakLine: false, margin: .1, paraSpaceAfterPt: 18, valign: "top", breakLineOnOverflow: false });
}
