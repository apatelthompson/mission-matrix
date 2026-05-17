"use client";

import { useMemo } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  quadrantFor,
  type AssessmentState,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame, PgBottom } from "./PgShell";

const Q_META: Record<Quadrant, { tint: string; ink: string }> = {
  craft: { tint: "var(--q-craft)", ink: "var(--q-craft-ink)" },
  growth: { tint: "var(--q-edge)", ink: "var(--q-edge-ink)" },
  drain: { tint: "var(--q-skill)", ink: "var(--q-skill-ink)" },
  routine: { tint: "var(--q-routine)", ink: "var(--q-routine-ink)" },
};

/** 2×2 layout order matches StepPlot. */
const LAYOUT: Quadrant[] = ["growth", "craft", "routine", "drain"];

const PROMPTS: Array<{
  key: "reflection_1" | "reflection_2" | "reflection_3";
  text: string;
}> = [
  {
    key: "reflection_1",
    text: "Which quadrant is most crowded — and is that a surprise?",
  },
  {
    key: "reflection_2",
    text: "What's one item that jumped quadrants between your gut and your rating?",
  },
  {
    key: "reflection_3",
    text: "What's something you'd love to do more of — but don't yet have the expertise for?",
  },
];

function MiniMatrix({
  state,
  highlight,
}: {
  state: AssessmentState;
  highlight: boolean;
}) {
  const counts: Record<Quadrant, number> = {
    craft: 0,
    growth: 0,
    routine: 0,
    drain: 0,
  };
  for (const it of state.items) {
    if (it.meaning == null || it.expertise == null || !it.text.trim()) continue;
    counts[quadrantFor(it.meaning, it.expertise)]++;
  }
  const max = Math.max(...Object.values(counts));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 4,
        width: 96,
        height: 96,
        flexShrink: 0,
      }}
    >
      {LAYOUT.map((q) => {
        const isMax = counts[q] === max && counts[q] > 0;
        const meta = Q_META[q];
        return (
          <div
            key={q}
            style={{
              background: meta.tint,
              borderRadius: 6,
              display: "grid",
              placeItems: "center",
              position: "relative",
              opacity: highlight && !isMax ? 0.45 : 1,
              transition: "opacity .25s",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: meta.ink }}>
              {counts[q]}
            </span>
            {isMax && highlight && (
              <span
                style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: 8,
                  border: `2px solid ${meta.ink}`,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PromptCard({
  index,
  text,
  value,
  onChange,
  state,
  highlight,
}: {
  index: number;
  text: string;
  value: string;
  onChange: (v: string) => void;
  state: AssessmentState;
  highlight: boolean;
}) {
  const wc = (value || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "14px 18px",
        background: "var(--paper-soft)",
        border: "1px solid var(--line-soft)",
        borderRadius: 14,
        transition: "border-color .2s ease",
      }}
    >
      <MiniMatrix state={state} highlight={highlight} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--forest)",
            }}
          >
            0{index + 1}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              lineHeight: 1.4,
            }}
          >
            {text}
          </h3>
        </div>

        <textarea
          className="pg-textarea"
          placeholder="Whatever comes to mind. A sentence is plenty."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight: 56 }}
        />
        {wc > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            {wc} word{wc === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StepReflect({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, update } = useAssessment();

  // Only highlight the crowded-quadrant mini matrix on the first prompt
  // (the one asking about the crowded quadrant). The others get neutral.
  const highlightIndex = 0;

  // Memoize for stable identity
  const stateRef = useMemo(() => state, [state]);

  return (
    <PgFrame
      title="What do you see?"
      subhead="Three short prompts. These stay with you — answer only what you want to answer."
      bottom={
        <PgBottom onBack={onBack} onContinue={onNext} continueLabel="Wrap up →" />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 6,
          marginRight: -6,
        }}
      >
        {PROMPTS.map((p, i) => (
          <PromptCard
            key={p.key}
            index={i}
            text={p.text}
            value={state[p.key]}
            onChange={(v) =>
              update({ [p.key]: v } as Partial<AssessmentState>)
            }
            state={stateRef}
            highlight={i === highlightIndex}
          />
        ))}
      </div>
    </PgFrame>
  );
}
