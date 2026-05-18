import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AssessmentItem,
  AssessmentState,
  Quadrant,
} from "./mission-matrix-types";
import { quadrantFor } from "./mission-matrix-types";

/**
 * Renders a finished Mission Matrix report PDF from a saved
 * AssessmentState. This is a full report, not a fillable worksheet —
 * the older template-fill approach was retired when the digital flow
 * stopped being a printout-and-pencil exercise.
 *
 * Layout:
 *   1. Cover     — title, name, date, profile summary
 *   2. Matrix    — 2x2 of quadrant tiles with item counts + first lines
 *   3. Items     — by quadrant, with M·E score chips
 *   4. Reflect   — three prompts + answers, if any
 *   5. Part II   — per quadrant: archetype + brainstorm notes
 */

// ─── Constants ─────────────────────────────────────────────────────
// US Letter, points.
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 60;
const CONTENT_W = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  paper: rgb(0.945, 0.925, 0.871),       // #F1ECDE
  paperSoft: rgb(0.965, 0.945, 0.894),   // #F6F1E4
  ink: rgb(0.102, 0.102, 0.102),         // #1A1A1A
  inkSoft: rgb(0.29, 0.29, 0.29),        // #4A4A4A
  inkMuted: rgb(0.486, 0.463, 0.412),    // #7C7669
  inkFaint: rgb(0.659, 0.624, 0.529),    // #A89F87
  forest: rgb(0.239, 0.361, 0.188),      // #3D5C30
  forestDeep: rgb(0.173, 0.263, 0.133),  // #2C4322
  line: rgb(0.863, 0.824, 0.725),        // #DCD2B9
  white: rgb(1, 1, 1),
  qCraftBg: rgb(0.851, 0.922, 0.847),    // #D9EBD8
  qCraftInk: rgb(0.118, 0.239, 0.102),   // #1E3D1A
  qEdgeBg: rgb(0.843, 0.922, 0.961),     // #D7EBF5
  qEdgeInk: rgb(0.102, 0.227, 0.322),    // #1A3A52
  qSkillBg: rgb(0.914, 0.894, 0.969),    // #E9E4F7
  qSkillInk: rgb(0.18, 0.122, 0.369),    // #2E1F5E
  qRoutineBg: rgb(1, 0.890, 0.8),        // #FFE3CC
  qRoutineInk: rgb(0.420, 0.227, 0.063), // #6B3A10
};

const Q_META: Record<
  Quadrant,
  {
    name: string;
    subtitle: string;
    archetype: string;
    bg: ReturnType<typeof rgb>;
    ink: ReturnType<typeof rgb>;
  }
> = {
  craft: {
    name: "Your core craft",
    subtitle: "High meaning · High unique expertise",
    archetype: "Forcefield agent",
    bg: COLORS.qCraftBg,
    ink: COLORS.qCraftInk,
  },
  growth: {
    name: "Your growth edge",
    subtitle: "High meaning · Low unique expertise",
    archetype: "Chat with strong memory",
    bg: COLORS.qEdgeBg,
    ink: COLORS.qEdgeInk,
  },
  drain: {
    name: "Skilled but draining",
    subtitle: "Low meaning · High unique expertise",
    archetype: "Skills / templates",
    bg: COLORS.qSkillBg,
    ink: COLORS.qSkillInk,
  },
  routine: {
    name: "Routine tasks",
    subtitle: "Low meaning · Low unique expertise",
    archetype: "Automate — or eliminate",
    bg: COLORS.qRoutineBg,
    ink: COLORS.qRoutineInk,
  },
};

// ─── Font loading ──────────────────────────────────────────────────
// Body uses Helvetica (standard PDF font) — Airbnb Cereal as a custom
// embedded TTF triggers ligature-rendering gaps in real viewers when
// pdf-lib's per-glyph positioning is read against the font's OpenType
// substitutions ("different" rendered as "diff erent" etc.). Helvetica
// is a clean grotesque sans that reads close enough to the web flow.
// Recoleta stays as the headings face — it doesn't show the bug.
async function loadFonts(doc: PDFDocument) {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const read = (n: string) => fs.readFile(path.join(fontDir, n));
  const [serifR, serifB] = await Promise.all([
    read("Recoleta-Regular.otf"),
    read("Recoleta-Bold.otf"),
  ]);
  return {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bodyBold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(serifR),
    serifBold: await doc.embedFont(serifB),
  };
}

type Fonts = Awaited<ReturnType<typeof loadFonts>>;

// ─── Cursor / page mgmt ────────────────────────────────────────────
interface Cursor {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  fonts: Fonts;
}

function newPage(doc: PDFDocument): PDFPage {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: COLORS.paper,
  });
  return page;
}

function ensureSpace(c: Cursor, needed: number): Cursor {
  if (c.y - needed < MARGIN_BOTTOM) {
    const page = newPage(c.doc);
    return { ...c, page, y: PAGE_HEIGHT - MARGIN_TOP };
  }
  return c;
}

/**
 * Begin a major section. Reserves room for the leading spacer +
 * eyebrow + h2 + first content block (`firstBlock` pts). If that
 * won't all fit on the current page, jumps to a new page first so
 * the section header doesn't orphan at the bottom.
 */
function startSection(c: Cursor, firstBlock: number): Cursor {
  const SECTION_HEAD = 30 + 14 + 4 + 24 + 12; // spacer + eyebrow + spacer + h2 + spacer
  const total = SECTION_HEAD + firstBlock;
  if (c.y - total < MARGIN_BOTTOM) {
    const page = newPage(c.doc);
    return { ...c, page, y: PAGE_HEIGHT - MARGIN_TOP };
  }
  return drawSpacer(c, 30);
}

// ─── Text helpers ──────────────────────────────────────────────────
/**
 * Standard-font Helvetica only encodes WinAnsi-1252. Curly quotes,
 * em-dashes, and arrows that a user might paste in (or that we draw
 * for axis labels) will throw at encode time — sanitize first.
 * Recoleta is embedded and handles Unicode fine, but we run all text
 * through this for consistency.
 */
function sanitize(text: string): string {
  return text
    .replace(/[←⇐]/g, "<-")
    .replace(/[→⇒]/g, "->")
    .replace(/[↑]/g, "^")
    .replace(/[↓]/g, "v")
    .replace(/[—–]/g, " - ")
    // collapse the spaces if the em-dash already had spaces around it
    .replace(/ {2,}-/g, " -")
    .replace(/- {2,}/g, "- ")
    .replace(/[''‚‛]/g, "'")
    .replace(/[""„‟]/g, '"')
    .replace(/[…]/g, "...");
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  if (!text) return [];
  // Sanitize internally — some callers (drawAudition's per-item wrap,
  // for instance) bypass drawText and would otherwise pass raw user
  // input straight to font.widthOfTextAtSize, which uses the font's
  // encoder and throws on non-WinAnsi characters like "→".
  text = sanitize(text);
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    else lines.push("");
  }
  return lines;
}

function drawText(
  c: Cursor,
  text: string,
  options: {
    x?: number;
    font: PDFFont;
    size: number;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
    lineHeight?: number;
  },
): Cursor {
  const { font, size } = options;
  const x = options.x ?? MARGIN_X;
  const color = options.color ?? COLORS.ink;
  const maxWidth = options.maxWidth ?? CONTENT_W;
  const lineHeight = options.lineHeight ?? size * 1.35;

  const lines = wrapText(sanitize(text), font, size, maxWidth);
  let cur = c;
  for (const line of lines) {
    cur = ensureSpace(cur, lineHeight);
    rawDraw(cur.page, line, {
      x,
      y: cur.y - size,
      font,
      size,
      color,
    });
    cur = { ...cur, y: cur.y - lineHeight };
  }
  return cur;
}

/** Direct (non-wrapping) text draw — sanitizes the string before
 *  handing to pdf-lib so callers don't have to. */
function rawDraw(
  page: PDFPage,
  text: string,
  options: Parameters<PDFPage["drawText"]>[1],
) {
  page.drawText(sanitize(text), options);
}

function drawSpacer(c: Cursor, h: number): Cursor {
  return { ...c, y: c.y - h };
}

function drawEyebrow(c: Cursor, text: string): Cursor {
  return drawText(c, text.toUpperCase(), {
    font: c.fonts.bodyBold,
    size: 9,
    color: COLORS.forest,
    lineHeight: 14,
  });
}

function drawH1(c: Cursor, text: string): Cursor {
  return drawText(c, text, {
    font: c.fonts.serifBold,
    size: 32,
    color: COLORS.forestDeep,
    lineHeight: 38,
  });
}

function drawH2(c: Cursor, text: string): Cursor {
  return drawText(c, text, {
    font: c.fonts.serifBold,
    size: 18,
    color: COLORS.forestDeep,
    lineHeight: 24,
  });
}

function drawBody(c: Cursor, text: string, color = COLORS.inkSoft): Cursor {
  return drawText(c, text, {
    font: c.fonts.body,
    size: 11,
    color,
    lineHeight: 15.5,
  });
}

// ─── Sections ──────────────────────────────────────────────────────
function drawCover(c: Cursor, _state: AssessmentState): Cursor {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  let cur = drawEyebrow(
    c,
    `Mission Matrix · Personalized report · ${today}`,
  );
  cur = drawSpacer(cur, 6);
  cur = drawH1(cur, "Your Mission Matrix");
  return cur;
}

function drawMatrixOverview(
  c: Cursor,
  byQuad: Record<Quadrant, AssessmentItem[]>,
): Cursor {
  const gridW = CONTENT_W;
  const gridH = 280;
  const tileW = (gridW - 10) / 2;
  const tileH = (gridH - 10) / 2;
  // Push to a new page if the grid + axis labels won't fit; the grid
  // is one atomic visual so it shouldn't get split.
  let cur = ensureSpace(drawSpacer(c, 26), gridH + 60);

  // X-axis labels — positions imply direction (left/right of the grid)
  // so we keep them word-only, no arrows.
  rawDraw(cur.page, "LOW UNIQUE EXPERTISE", {
    x: MARGIN_X,
    y: cur.y - 10,
    font: cur.fonts.bodyBold,
    size: 8,
    color: COLORS.inkMuted,
  });
  const xRight = "HIGH UNIQUE EXPERTISE";
  rawDraw(cur.page, xRight, {
    x:
      MARGIN_X +
      gridW -
      cur.fonts.bodyBold.widthOfTextAtSize(xRight, 8),
    y: cur.y - 10,
    font: cur.fonts.bodyBold,
    size: 8,
    color: COLORS.inkMuted,
  });
  cur = { ...cur, y: cur.y - 22 };

  const gridTop = cur.y;
  const tiles: Array<{ q: Quadrant; x: number; y: number }> = [
    { q: "growth", x: MARGIN_X, y: gridTop - tileH },
    { q: "craft", x: MARGIN_X + tileW + 10, y: gridTop - tileH },
    { q: "routine", x: MARGIN_X, y: gridTop - tileH * 2 - 10 },
    { q: "drain", x: MARGIN_X + tileW + 10, y: gridTop - tileH * 2 - 10 },
  ];

  for (const t of tiles) {
    const meta = Q_META[t.q];
    const items = byQuad[t.q];
    cur.page.drawRectangle({
      x: t.x,
      y: t.y,
      width: tileW,
      height: tileH,
      color: meta.bg,
    });
    rawDraw(cur.page, meta.name, {
      x: t.x + 14,
      y: t.y + tileH - 22,
      font: cur.fonts.serifBold,
      size: 14,
      color: meta.ink,
    });
    const countStr = String(items.length);
    rawDraw(cur.page, countStr, {
      x:
        t.x +
        tileW -
        14 -
        cur.fonts.bodyBold.widthOfTextAtSize(countStr, 11),
      y: t.y + tileH - 22,
      font: cur.fonts.bodyBold,
      size: 11,
      color: meta.ink,
    });
    let lineY = t.y + tileH - 42;
    const previewItems = items.slice(0, 4);
    for (const it of previewItems) {
      if (lineY < t.y + 12) break;
      const lines = wrapText(
        `· ${it.text}`,
        cur.fonts.body,
        9,
        tileW - 28,
      );
      for (const line of lines.slice(0, 1)) {
        rawDraw(cur.page, line, {
          x: t.x + 14,
          y: lineY,
          font: cur.fonts.body,
          size: 9,
          color: meta.ink,
        });
        lineY -= 13;
      }
    }
    if (items.length > previewItems.length) {
      rawDraw(cur.page, `+ ${items.length - previewItems.length} more`, {
        x: t.x + 14,
        y: lineY,
        font: cur.fonts.bodyBold,
        size: 9,
        color: meta.ink,
      });
    }
  }

  return { ...cur, y: gridTop - gridH - 8 };
}

function drawItemsByQuadrant(
  c: Cursor,
  byQuad: Record<Quadrant, AssessmentItem[]>,
): Cursor {
  // Always start the detailed view on its own page so it reads as a
  // distinct section, separate from the matrix overview.
  const page = newPage(c.doc);
  let cur: Cursor = { ...c, page, y: PAGE_HEIGHT - MARGIN_TOP };
  cur = drawEyebrow(cur, "Your items, in detail");
  cur = drawSpacer(cur, 4);
  cur = drawH2(cur, "Every task with its scores.");
  cur = drawSpacer(cur, 12);

  for (const q of ["craft", "growth", "drain", "routine"] as Quadrant[]) {
    const items = byQuad[q];
    if (items.length === 0) continue;
    cur = ensureSpace(cur, 60);

    const headerH = 26;
    cur.page.drawRectangle({
      x: MARGIN_X,
      y: cur.y - headerH,
      width: CONTENT_W,
      height: headerH,
      color: Q_META[q].bg,
    });
    rawDraw(cur.page, Q_META[q].name, {
      x: MARGIN_X + 12,
      y: cur.y - 18,
      font: cur.fonts.serifBold,
      size: 13,
      color: Q_META[q].ink,
    });
    const subStr = Q_META[q].subtitle;
    rawDraw(cur.page, subStr, {
      x:
        MARGIN_X +
        CONTENT_W -
        12 -
        cur.fonts.body.widthOfTextAtSize(subStr, 9),
      y: cur.y - 17,
      font: cur.fonts.body,
      size: 9,
      color: Q_META[q].ink,
    });
    cur = { ...cur, y: cur.y - headerH - 6 };

    for (const it of items) {
      cur = ensureSpace(cur, 22);
      const chip = `M${it.meaning}·E${it.expertise}`;
      const chipW = cur.fonts.bodyBold.widthOfTextAtSize(chip, 8) + 12;
      cur.page.drawRectangle({
        x: MARGIN_X,
        y: cur.y - 14,
        width: chipW,
        height: 14,
        color: Q_META[q].ink,
      });
      rawDraw(cur.page, chip, {
        x: MARGIN_X + 6,
        y: cur.y - 11,
        font: cur.fonts.bodyBold,
        size: 8,
        color: COLORS.white,
      });
      const itemTextX = MARGIN_X + chipW + 8;
      const lines = wrapText(
        it.text,
        cur.fonts.body,
        11,
        CONTENT_W - chipW - 8,
      );
      for (let i = 0; i < lines.length; i++) {
        rawDraw(cur.page, lines[i], {
          x: itemTextX,
          y: cur.y - 11 - i * 15.5,
          font: cur.fonts.body,
          size: 11,
          color: COLORS.inkSoft,
        });
      }
      const block = Math.max(15.5, lines.length * 15.5);
      cur = { ...cur, y: cur.y - block - 4 };
    }
    cur = drawSpacer(cur, 8);
  }
  return cur;
}

function drawReflections(c: Cursor, state: AssessmentState): Cursor {
  const reflections = [
    {
      prompt: "Which quadrant is most crowded — and is that a surprise?",
      answer: state.reflection_1,
    },
    {
      prompt:
        "What's one item that jumped quadrants between your gut and your rating?",
      answer: state.reflection_2,
    },
    {
      prompt:
        "What's something you'd love to do more of — but don't yet have the expertise for?",
      answer: state.reflection_3,
    },
  ].filter((r) => r.answer && r.answer.trim());

  if (reflections.length === 0) return c;

  // First content block = one prompt + first line of answer ~ 50pt.
  let cur = startSection(c, 60);
  cur = drawEyebrow(cur, "What you noticed");
  cur = drawSpacer(cur, 4);
  cur = drawH2(cur, "Your reflections.");
  cur = drawSpacer(cur, 12);

  reflections.forEach((r, i) => {
    cur = ensureSpace(cur, 60);
    cur = drawText(cur, `0${i + 1} · ${r.prompt}`, {
      font: cur.fonts.bodyBold,
      size: 11,
      color: COLORS.forest,
      lineHeight: 15.5,
    });
    cur = drawSpacer(cur, 2);
    cur = drawBody(cur, r.answer);
    cur = drawSpacer(cur, 14);
  });

  return cur;
}

function drawAudition(
  c: Cursor,
  byQuad: Record<Quadrant, AssessmentItem[]>,
  state: AssessmentState,
): Cursor {
  const notesField: Record<
    Quadrant,
    "brainstorm_craft" | "brainstorm_growth" | "brainstorm_routine" | "brainstorm_drain"
  > = {
    craft: "brainstorm_craft",
    growth: "brainstorm_growth",
    routine: "brainstorm_routine",
    drain: "brainstorm_drain",
  };

  const hasAnyNotes = (
    ["craft", "growth", "drain", "routine"] as Quadrant[]
  ).some((q) => state[notesField[q]] && state[notesField[q]]!.trim());
  const hasAnyItems = (
    ["craft", "growth", "drain", "routine"] as Quadrant[]
  ).some((q) => byQuad[q].length > 0);
  if (!hasAnyNotes && !hasAnyItems) return c;

  // Part II starts on a fresh page so it reads as a distinct section.
  const page = newPage(c.doc);
  let cur: Cursor = { ...c, page, y: PAGE_HEIGHT - MARGIN_TOP };

  cur = drawEyebrow(cur, "Part II · Audition AI for the role");
  cur = drawSpacer(cur, 6);
  cur = drawH1(cur, "What you'd build.");
  cur = drawSpacer(cur, 6);
  cur = drawBody(
    cur,
    "Each quadrant calls for a different shape of AI. Below: the archetype that fits the work in that quadrant, and your notes on what you'd actually build.",
    COLORS.inkMuted,
  );
  cur = drawSpacer(cur, 20);

  for (const q of ["craft", "growth", "drain", "routine"] as Quadrant[]) {
    const meta = Q_META[q];
    const notes = state[notesField[q]]?.trim() ?? "";
    const items = byQuad[q];
    if (!notes && items.length === 0) continue;

    cur = ensureSpace(cur, 90);

    const headerH = 36;
    cur.page.drawRectangle({
      x: MARGIN_X,
      y: cur.y - headerH,
      width: CONTENT_W,
      height: headerH,
      color: meta.bg,
    });
    rawDraw(cur.page, meta.name, {
      x: MARGIN_X + 14,
      y: cur.y - 16,
      font: cur.fonts.serifBold,
      size: 14,
      color: meta.ink,
    });
    rawDraw(cur.page, `AI archetype: ${meta.archetype}`, {
      x: MARGIN_X + 14,
      y: cur.y - 30,
      font: cur.fonts.bodyBold,
      size: 9,
      color: meta.ink,
    });
    const sub = `${items.length} item${items.length === 1 ? "" : "s"}`;
    rawDraw(cur.page, sub, {
      x:
        MARGIN_X +
        CONTENT_W -
        14 -
        cur.fonts.body.widthOfTextAtSize(sub, 10),
      y: cur.y - 22,
      font: cur.fonts.body,
      size: 10,
      color: meta.ink,
    });
    cur = { ...cur, y: cur.y - headerH - 12 };

    for (const it of items.slice(0, 6)) {
      cur = ensureSpace(cur, 16);
      rawDraw(cur.page, "•", {
        x: MARGIN_X + 4,
        y: cur.y - 11,
        font: cur.fonts.body,
        size: 11,
        color: COLORS.inkMuted,
      });
      const lines = wrapText(it.text, cur.fonts.body, 11, CONTENT_W - 20);
      for (let i = 0; i < lines.length; i++) {
        rawDraw(cur.page, lines[i], {
          x: MARGIN_X + 16,
          y: cur.y - 11 - i * 15,
          font: cur.fonts.body,
          size: 11,
          color: COLORS.ink,
        });
      }
      cur = { ...cur, y: cur.y - Math.max(15, lines.length * 15) - 2 };
    }
    if (items.length > 6) {
      cur = drawBody(cur, `+ ${items.length - 6} more`, COLORS.inkMuted);
    }

    if (notes) {
      cur = drawSpacer(cur, 8);
      cur = drawText(cur, "Your notes — what you'd build", {
        font: cur.fonts.bodyBold,
        size: 9,
        color: COLORS.inkMuted,
        lineHeight: 14,
      });
      cur = drawSpacer(cur, 2);
      cur = drawBody(cur, notes, COLORS.ink);
    }

    cur = drawSpacer(cur, 18);
  }

  return cur;
}

// ─── Entrypoint ────────────────────────────────────────────────────
export async function fillAssessmentPdf(
  state: AssessmentState,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // fontkit is required to embed custom TTF/OTF fonts
  doc.registerFontkit(fontkit);
  doc.setTitle("Your Mission Matrix");
  doc.setAuthor(state.name?.trim() || "Mission Matrix");
  doc.setCreator("Mission Matrix");
  doc.setProducer("Mission Matrix");

  const fonts = await loadFonts(doc);

  const byQuad: Record<Quadrant, AssessmentItem[]> = {
    craft: [],
    growth: [],
    routine: [],
    drain: [],
  };
  for (const it of state.items) {
    if (it.meaning == null || it.expertise == null || !it.text.trim()) continue;
    byQuad[quadrantFor(it.meaning, it.expertise)].push(it);
  }

  const firstPage = newPage(doc);
  let cur: Cursor = {
    doc,
    page: firstPage,
    y: PAGE_HEIGHT - MARGIN_TOP,
    fonts,
  };

  cur = drawCover(cur, state);
  cur = drawMatrixOverview(cur, byQuad);
  cur = drawItemsByQuadrant(cur, byQuad);
  cur = drawReflections(cur, state);
  cur = drawAudition(cur, byQuad, state);
  void cur;

  return doc.save();
}
