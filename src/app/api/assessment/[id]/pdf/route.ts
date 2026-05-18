import { NextResponse } from "next/server";
import { loadAssessment } from "@/lib/mission-matrix-airtable";
import { fillPart1Pdf, fillPart2Pdf } from "@/lib/fill-pdf";

export const runtime = "nodejs";

/**
 * GET  /api/assessment/[id]/pdf
 *   Returns the Part 1 report (matrix + items + reflections). Strictly
 *   no Part-II content — clicking Download on Step 6 lands here.
 *
 * POST /api/assessment/[id]/pdf
 *   Returns the Part 2 report (AI playbook + brainstorm). Accepts a
 *   `suggestions` map in the body because AI suggestions live in
 *   client state (not Airtable), so they have to be supplied at
 *   render time. Step 8's "Download full assessment" button lands here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^rec[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const state = await loadAssessment(id);
  if (!state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await fillPart1Pdf(state);
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mission-matrix-part1-${id}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("[assessment pdf] part1 fill failed", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^rec[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { suggestions?: Record<string, string[]> } = {};
  try {
    // Empty body is fine — render Part 2 with no AI suggestions.
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const state = await loadAssessment(id);
  if (!state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await fillPart2Pdf(state, body.suggestions ?? {});
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mission-matrix-part2-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[assessment pdf] part2 fill failed", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
