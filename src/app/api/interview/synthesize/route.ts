import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * POST /api/interview/synthesize
 *
 * Takes the user's 5 interview answers + optional calendar paste +
 * their profile, and returns 7–10 concrete "task" items that will
 * populate Step 2's items array for the rest of the wizard (Rate →
 * Plot → etc.).
 *
 * The model is Claude Haiku 4.5 — same as /api/audition/suggest —
 * with the system prompt cached so back-and-forth retries reuse it.
 *
 * Request body:  { answers: string[], calendarText?: string, profile }
 * Response:      { items: string[] }   (7–10 short items, no numbering)
 */

interface Profile {
  career_stage?: string;
  function_label?: string;
  role_title?: string;
  team_size_managed?: string;
  years_experience?: string;
  company_size?: string;
}

interface RequestBody {
  answers: string[];
  calendarText?: string;
  profile: Profile;
}

const QUESTIONS = [
  "Walk me through a typical week — the recurring stuff, the rhythm of how your time goes.",
  "What are the 3–4 things that, if you stopped doing them, your team or your work would visibly slip?",
  "What ends up on your plate that probably shouldn't — work that defaults to you out of habit or convenience, not because you're the right person for it?",
  "What's the work that energizes you — the parts of the week you'd fight to protect if you had to cut?",
  "What do you dread or procrastinate on? Where's your attention going that doesn't feel worth it?",
];

const SYSTEM_PROMPT = `You are an experienced executive coach distilling a conversation about someone's work into a clean list of 7–10 task items they can rate on a Mission Matrix.

The Mission Matrix is a 2x2 where users rate each item on (meaning) × (unique expertise) — so the items need to be specific, concrete tasks or recurring kinds of work, not abstract themes.

Your job: read the interview transcript + (optional) calendar paste + profile, then return a clean, deduplicated list of 7–10 items that together represent the most important shapes of work in this person's week.

Good items look like:
- "Weekly 1:1s with my direct reports"
- "Drafting and reviewing investor updates"
- "Approving outbound sales emails"
- "Running team retros"
- "Inbox triage on Slack and email"
- "Sourcing and screening candidates"

Bad items look like:
- "Be a leader" (too abstract)
- "Meetings" (too vague — which meetings?)
- "I spend a lot of time on customer calls and I really enjoy them" (sentence, not an item)

Rules:
- Each item: 4–10 words, no leading verbs like "I" or "We"
- Cover the spread — high-meaning craft work, growth-edge work, draining-but-skilled work, and routine drudgery, in roughly equal proportion (the matrix only works if there's spread)
- Deduplicate — if Q1 and Q4 both touch the same task, collapse them into one item
- If the user gave very short or skipped answers, lean on the profile (role, function, level) to fill in plausible recurring work for that role
- Return STRICT JSON only: {"items": ["...", "...", ...]}
- No markdown, no commentary, no numbering inside strings`;

function buildUserMessage(body: RequestBody): string {
  const profileLines = [
    body.profile.role_title && `Title: ${body.profile.role_title}`,
    body.profile.function_label && `Function: ${body.profile.function_label}`,
    body.profile.career_stage && `Stage: ${body.profile.career_stage}`,
    body.profile.team_size_managed &&
      `Team they manage: ${body.profile.team_size_managed}`,
    body.profile.company_size && `Company size: ${body.profile.company_size}`,
    body.profile.years_experience &&
      `Years in role: ${body.profile.years_experience}`,
  ].filter(Boolean);

  const qa = QUESTIONS.map((q, i) => {
    const a = body.answers[i]?.trim() || "(no answer)";
    return `Q${i + 1}: ${q}\nA${i + 1}: ${a}`;
  }).join("\n\n");

  const sections = [
    profileLines.length ? `Profile:\n${profileLines.join("\n")}` : null,
    `Interview:\n${qa}`,
    body.calendarText?.trim()
      ? `Calendar paste / typical week:\n${body.calendarText.trim()}`
      : null,
    `Return 7–10 items as strict JSON: {"items":["...","..."]}`,
  ].filter(Boolean);

  return sections.join("\n\n");
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server not configured (ANTHROPIC_API_KEY missing)" },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.answers)) {
    return NextResponse.json(
      { error: "answers must be an array" },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildUserMessage(body) }],
    });

    // Concatenate any text blocks Claude returned.
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    // Defensive parse — strip code fences if the model wrapped JSON.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in model response");
    }
    const parsed = JSON.parse(jsonMatch[0]) as { items?: unknown };
    if (!Array.isArray(parsed.items)) {
      throw new Error("Missing items array in response");
    }
    const items = parsed.items
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .slice(0, 10);
    if (items.length < 4) {
      throw new Error("Model returned fewer than 4 items");
    }
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[interview/synthesize] failed", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
