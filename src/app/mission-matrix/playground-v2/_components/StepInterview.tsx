"use client";

import { useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  FUNCTION_AREAS,
  type AssessmentItem,
} from "@/lib/mission-matrix-types";
import { PgFrame } from "./PgShell";

/**
 * Extended-tier Step 2.
 *
 * Replaces the manual brain dump with a short fixed-script interview
 * (5 questions + an optional calendar paste). At the end we hit
 * /api/interview/synthesize, which turns the transcript into 7–10
 * candidate items and writes them into state.items — from there the
 * wizard continues exactly as the base flow does (Rate → Plot →
 * Reflect → …).
 *
 * Users can bail to the manual seeds with the "Skip — do it manually"
 * link in the bottom bar. The whole thing is text-only; the top hint
 * encourages voice-to-text on the phone keyboard.
 */

const QUESTIONS = [
  "Walk me through a typical week — the recurring stuff, the rhythm of how your time goes.",
  "What are the 3–4 things that, if you stopped doing them, your team or your work would visibly slip?",
  "What ends up on your plate that probably shouldn't — work that defaults to you out of habit or convenience, not because you're the right person for it?",
  "What's the work that energizes you — the parts of the week you'd fight to protect if you had to cut?",
  "What do you dread or procrastinate on? Where's your attention going that doesn't feel worth it?",
];

// Total steps inside the interview: 5 questions + 1 calendar step.
const CALENDAR_INDEX = QUESTIONS.length; // 5
const LAST_INDEX = CALENDAR_INDEX; // also 5 — calendar is the last step

export default function StepInterview({
  onNext,
  onBack,
  onSkipToManual,
}: {
  /** Called once items have been synthesized and written to state. */
  onNext: () => void;
  /** Back to Step 1 (profile). */
  onBack: () => void;
  /** Drop out of the interview and use the manual seed-suggestion flow
   *  (StepStarters) instead. */
  onSkipToManual: () => void;
}) {
  const { state, update } = useAssessment();

  // Local cursor — which question (or the calendar) we're on.
  const [idx, setIdx] = useState(0);
  // Loading + error for the synthesize call.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answers = state.interview_answers ?? Array(QUESTIONS.length).fill("");
  const calendar = state.interview_calendar ?? "";

  function setAnswer(i: number, v: string) {
    const next = [...answers];
    while (next.length < QUESTIONS.length) next.push("");
    next[i] = v;
    update({ interview_answers: next });
  }

  const currentAnswer = idx < CALENDAR_INDEX ? (answers[idx] ?? "") : "";
  const isCalendarStep = idx === CALENDAR_INDEX;
  const canAdvance = isCalendarStep
    ? true // calendar step is optional
    : currentAnswer.trim().length > 0;

  async function synthesize() {
    setBusy(true);
    setError(null);
    try {
      const functionLabel = FUNCTION_AREAS.find(
        (f) => f.id === state.function_area,
      )?.label;
      const res = await fetch("/api/interview/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          calendarText: calendar,
          profile: {
            career_stage: state.career_stage,
            function_label: functionLabel,
            role_title: state.role_title,
            team_size_managed: state.team_size_managed,
            years_experience: state.years_experience,
            company_size: state.company_size,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Synthesize failed (${res.status})`);
      }
      const body = (await res.json()) as { items: string[] };
      const newItems: AssessmentItem[] = body.items.map((text, i) => ({
        order: i + 1,
        text,
        meaning: null,
        expertise: null,
      }));
      update({ items: newItems });
      onNext();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't synthesize your items — try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (idx < LAST_INDEX) {
      setIdx(idx + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } else {
      void synthesize();
    }
  }
  function goPrev() {
    if (idx === 0) {
      onBack();
    } else {
      setIdx(idx - 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    }
  }

  return (
    <PgFrame
      narrow
      title={isCalendarStep ? "Anything else?" : "Tell me about your work."}
      subhead={
        isCalendarStep
          ? "Optional — paste a typical week from your calendar if you want me to pick up on what's recurring. Or skip this and synthesize."
          : `Question ${idx + 1} of ${QUESTIONS.length}. The answers feed an AI that distills your week into 7–10 items to rate.`
      }
      bottom={
        <>
          <button
            className="pg-pill ghost"
            onClick={goPrev}
            disabled={busy}
          >
            ← Back
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={onSkipToManual}
              disabled={busy}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-muted)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "8px 4px",
                fontFamily: "inherit",
                cursor: busy ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Skip — do it manually
            </button>
            <button
              className="pg-pill primary"
              onClick={goNext}
              disabled={busy || !canAdvance}
            >
              {busy
                ? "Synthesizing…"
                : idx === LAST_INDEX
                  ? "Synthesize my items →"
                  : "Next →"}
            </button>
          </div>
        </>
      }
    >
      {/* Voice-to-text hint — only on actual question steps; the
          calendar step expects pasted content. */}
      {!isCalendarStep && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--paper-bright)",
            border: "1px solid var(--line-soft)",
            borderRadius: 8,
            fontSize: 12.5,
            color: "var(--ink-muted)",
            marginBottom: 8,
            alignSelf: "flex-start",
          }}
        >
          <span>🎙️</span>
          <span>
            On your phone? Tap the mic on your keyboard to talk through
            your answer — much faster than typing.
          </span>
        </div>
      )}

      {isCalendarStep ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label
            htmlFor="calendar-paste"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Calendar / typical week{" "}
            <span
              style={{
                fontWeight: 500,
                color: "var(--ink-faint)",
                fontSize: 13,
              }}
            >
              (optional)
            </span>
          </label>
          <textarea
            id="calendar-paste"
            className="pg-textarea"
            placeholder={
              "Mon 10am team standup\nMon 2pm 1:1 with direct report\nTue 9am investor update review\nWed 11am customer call\n…"
            }
            value={calendar}
            onChange={(e) =>
              update({ interview_calendar: e.target.value })
            }
            style={{ minHeight: 200 }}
          />
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <p
            className="serif"
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--forest-deep)",
              letterSpacing: -0.2,
            }}
          >
            {QUESTIONS[idx]}
          </p>
          <textarea
            className="pg-textarea"
            placeholder="Take your time — a paragraph or two, however it comes out."
            value={currentAnswer}
            onChange={(e) => setAnswer(idx, e.target.value)}
            style={{ minHeight: 180 }}
            autoFocus
          />
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 16px",
            background: "#fde8e8",
            border: "1px solid #f4b8b8",
            borderRadius: 12,
            fontSize: 14,
            color: "#7a1a1a",
          }}
        >
          {error}
        </div>
      )}
    </PgFrame>
  );
}
