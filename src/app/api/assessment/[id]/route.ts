import { NextResponse } from "next/server";
import { updateAssessment } from "@/lib/mission-matrix-airtable";
import type { AssessmentState } from "@/lib/mission-matrix-types";

export const runtime = "nodejs";

/**
 * PATCH /api/assessment/[id]
 *
 * Update an existing assessment record in place with the latest state.
 * Called by the autosave-then-update flow: a row is first created via
 * POST when the user lands on the matrix (Step 4), then this endpoint
 * updates the same row on each subsequent navigation/Continue.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^rec[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: AssessmentState;
  try {
    body = (await req.json()) as AssessmentState;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  try {
    await updateAssessment(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[assessment] update failed", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
