import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/invite/check  { code: string }  →  { valid: boolean }
 *
 * Gates the "extended" experience (the AI audition + Part II PDF). For
 * v1, valid codes live as a server-side env var:
 *
 *   INVITE_CODES=engagement-alpha,acme-q2,...
 *
 * Comparison is case-insensitive + trimmed on both sides so clients
 * can type "ACME-Q2" or "  acme-q2 " and still get in. We can graduate
 * to an Airtable-backed table when we want per-code usage tracking.
 *
 * Security note: this isn't a high-security gate — it just decides
 * whether the wizard takes the longer branch. The same data still gets
 * saved either way, so an attacker who guesses a code just unlocks
 * more wizard steps. No real secrets are guarded here.
 */
export async function POST(req: Request) {
  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
  if (!raw) return NextResponse.json({ valid: false });

  const codes = (process.env.INVITE_CODES ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({ valid: codes.includes(raw) });
}
