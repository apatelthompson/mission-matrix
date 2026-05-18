import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  QUADRANT_META,
  type Quadrant,
} from "@/lib/mission-matrix-types";

/**
 * POST /api/audition/suggest
 *
 * Generates per-item AI helper sketches for one quadrant, tailored to
 * the user's role profile. Uses Claude Haiku 4.5 (cheap + fast) and
 * caches the system prompt so subsequent quadrant calls within the same
 * session reuse the role context for free.
 *
 * Request body: { quadrant, items, profile }
 * Response: { suggestions: { [itemText]: string[] } }  (2 sketches per item)
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
  quadrant: Quadrant;
  items: string[];
  profile: Profile;
}

/**
 * Per-quadrant constraint pack. Each defines:
 *   archetype      — the canonical AI shape that fits this quadrant
 *   suggest        — what kinds of helpers to suggest (the only kinds)
 *   forbid         — patterns to avoid (helpers from other quadrants)
 *   leadWith       — phrasing pattern for each sketch
 *   namedTools     — real-world tools the LLM may reference when they
 *                    clearly fit; do NOT force a named tool, only
 *                    surface one when it's the obvious answer
 */
const QUADRANT_GUIDE: Record<
  Quadrant,
  {
    archetype: string;
    suggest: string;
    forbid: string;
    leadWith: string;
    namedTools: string;
  }
> = {
  craft: {
    archetype:
      "Forcefield agent (the end state) — protection of attention starts with the user knowing their own lines",
    suggest:
      "The forcefield agent is the LONG-TERM endpoint — a personal agent that knows the user well enough to protect their craft work. Today's task is to help them ARTICULATE the lines a future agent will eventually enforce. Suggest reflection / articulation exercises that surface: (1) what 'in the zone' for this work looks like, (2) what kinds of interruptions should NEVER break it, (3) who has override priority, (4) what signal-vs-noise looks like for the inputs to this work, (5) the rules they wish someone (or something) would enforce on their behalf. These articulations become the future agent's first rules.",
    forbid:
      "Do NOT suggest tools that have AI participate in the craft work itself — no meeting note-takers (Granola, Otter, Fathom), no inbox-AI (Superhuman, Shortwave), no calendar-AI (Reclaim, Motion, Clockwise), no in-meeting summarizers. The craft is where the human shows up; AI's job here is to protect the work later, not enter it now. Also no Zaps, Skills, Projects, or one-off chat threads — those are other quadrants. Pure articulation exercises here.",
    leadWith:
      '"Map the signal:…", "Define the line:…", "Articulate the override list:…", "Write the rule:…", "Name what a future agent would need to know to protect…"',
    namedTools: "(no named tools for this quadrant — by design)",
  },
  growth: {
    archetype: "Chat with strong memory",
    suggest:
      "A chat-based thinking partner with persistent memory of the user's context, gaps, and how they like to be challenged. Think: Claude Projects loaded with the right system prompt + reference docs, chat threads pre-seeded with the user's stretch goals + constraints, learning companions that quiz them, prompts that turn the chat into a coach rather than an answer machine.",
    forbid:
      "Do NOT suggest autonomous agents, Zaps/automations, or one-line scripts. The growth edge is where the user wants partnership and conversation, not delegation.",
    leadWith:
      '"Claude Project for…", "Chat thread that…", "System prompt that…", "NotebookLM loaded with…"',
    namedTools:
      "You MAY reference specific tools when they clearly fit the work: **Claude Projects**, **ChatGPT Projects**, **Perplexity** (when the user is learning and needs sources), **NotebookLM** (when reference material is the constraint), **Wispr Flow** (when typing is the bottleneck, not the thinking). Only name a tool when it's the obvious answer — don't force one in.",
  },
  routine: {
    archetype: "Automate — or eliminate",
    suggest:
      "Concrete automations OR an explicit elimination move (stop doing it, push to a shared wiki, batch with team, change the upstream process). Always give one of each shape when possible — automation AND elimination — since elimination is usually the higher-leverage answer.",
    forbid:
      "Do NOT suggest chat threads, persistent agents, or Skills. The user shouldn't be touching this work to begin with.",
    leadWith:
      '"Zap that…", "Scheduled script that…", "Eliminate by…", "Push to wiki:…", "Batch with team:…"',
    namedTools:
      "You MAY reference specific tools when they clearly fit: **Zapier**, **Make**, **n8n**, **GitHub Actions**, **IFTTT** (consumer). Granola is fine here when the suggestion is 'log the call automatically' (transcript as artifact, not as AI participation). Only name a tool when it's the obvious answer.",
  },
  drain: {
    archetype: "Skills / Projects",
    suggest:
      "Packaged, reusable context the user invokes when they need to do this kind of work — but the AI does the heavy lifting. The user stays in the driver's seat but the friction drops. Think: a saved system prompt + reference files combo, a template that takes inputs and produces a polished output, a skill that knows the user's voice / format.",
    forbid:
      "Do NOT suggest autonomous agents (this work needs the user's judgment) or simple automations (the work is too contextual). NO chat threads — Skills/Projects are the unit.",
    leadWith:
      '"Claude Skill that…", "Claude Project for…", "Template that…", "Custom GPT that…"',
    namedTools:
      "You MAY reference specific tools when they clearly fit: **Claude Skills**, **Claude Projects** (template-loaded), **Custom GPTs**, **Lex** (templated writing), **Notion AI** (in-place drafting), **Grammarly** (review/polish), **Wispr Flow** (when dictation lifts the typing drain). Only name a tool when it's the obvious answer.",
  },
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI suggestions need the ANTHROPIC_API_KEY env var. Add it to .env.local (local) or Vercel project settings (production).",
      },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quadrant, items, profile } = body;
  if (!quadrant || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "quadrant and items[] are required" },
      { status: 400 },
    );
  }
  if (!QUADRANT_GUIDE[quadrant]) {
    return NextResponse.json({ error: "Unknown quadrant" }, { status: 400 });
  }

  const guide = QUADRANT_GUIDE[quadrant];
  const quadrantMeta = QUADRANT_META[quadrant];

  // System prompt — gets cached. Same across all 4 quadrant calls in a
  // session because the profile doesn't change mid-flow.
  const profileLines = [
    profile.career_stage && `Career stage: ${profile.career_stage}`,
    profile.function_label && `Function: ${profile.function_label}`,
    profile.role_title && `Title: ${profile.role_title}`,
    profile.team_size_managed &&
      `Team they manage: ${profile.team_size_managed}`,
    profile.years_experience && `Years in role: ${profile.years_experience}`,
    profile.company_size && `Company size: ${profile.company_size}`,
  ]
    .filter(Boolean)
    .join("\n");

  const systemText = `You are an AI advisor helping someone audition AI tools for the work on their plate. They have just mapped their work onto the Mission Matrix (a 2x2 of meaning x unique expertise), and now want concrete, specific ideas for AI helpers — at the level of "what would I actually build."

Their profile:
${profileLines || "(no profile provided)"}

Tailor every suggestion to their role, team size, and tenure. A CEO of a 5-person startup needs different helpers than a Senior Marketing Manager at a 500-person company. Reference their specific context where it adds signal.

Your job is to suggest concrete, buildable AI helpers — not vague advice. Each suggestion should be one tight sentence that names the helper's job and (when possible) hints at how it would work.`;

  const userText = `For each of these work items in the **${quadrantMeta.title}** quadrant (${quadrantMeta.subtitle}), suggest exactly 2 concrete AI helper sketches.

The ONLY archetype that fits this quadrant: **${guide.archetype}**.

WHAT TO SUGGEST (every sketch must be one of these):
${guide.suggest}

WHAT NOT TO SUGGEST:
${guide.forbid}

Lead every sketch with one of these phrasing patterns: ${guide.leadWith}.

NAMED TOOLS:
${guide.namedTools}

Items:
${items.map((it, i) => `${i + 1}. ${it}`).join("\n")}

Respond as a single JSON object with this exact shape — no markdown, no prose:
{
  "suggestions": {
    "<exact item text 1>": ["sketch 1", "sketch 2"],
    "<exact item text 2>": ["sketch 1", "sketch 2"],
    ...
  }
}

Each sketch: one sentence, specific, actionable. No filler. Reference the user's role/team/company context where it adds signal.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: systemText,
          // Cache the system prompt — saves tokens across the 4 quadrant
          // calls in a single session.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("LLM returned no text block");
    }

    // Defensive parse — the model is asked for JSON only, but strip
    // accidental code fences just in case.
    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw) as {
      suggestions: Record<string, string[]>;
    };

    return NextResponse.json({
      suggestions: parsed.suggestions,
      usage: response.usage,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unknown error generating suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
