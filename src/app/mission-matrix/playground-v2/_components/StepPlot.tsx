"use client";

import { useMemo, useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  quadrantFor,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame, PgBottom } from "./PgShell";

interface PlottedItem {
  text: string;
  meaning: number;
  expertise: number;
  order: number;
}

const Q_META: Record<
  Quadrant,
  { name: string; tint: string; ink: string }
> = {
  craft: { name: "Your core craft", tint: "var(--q-craft)", ink: "var(--q-craft-ink)" },
  growth: { name: "Your growth edge", tint: "var(--q-edge)", ink: "var(--q-edge-ink)" },
  drain: { name: "Skilled but draining", tint: "var(--q-skill)", ink: "var(--q-skill-ink)" },
  routine: { name: "Routine tasks", tint: "var(--q-routine)", ink: "var(--q-routine-ink)" },
};

/** 2×2 layout: top row = high meaning, bottom = low meaning;
 *  left col = low unique expertise, right col = high unique expertise. */
const LAYOUT: Quadrant[] = ["growth", "craft", "routine", "drain"];

function QuadrantTile({
  q,
  items,
  focusKey,
  setFocusKey,
}: {
  q: Quadrant;
  items: PlottedItem[];
  focusKey: number | null;
  setFocusKey: (k: number | null) => void;
}) {
  const meta = Q_META[q];
  return (
    <div
      style={{
        background: meta.tint,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <h3
          className="serif"
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: meta.ink,
            letterSpacing: -0.3,
          }}
        >
          {meta.name}
        </h3>
        <span
          style={{
            minWidth: 24,
            height: 24,
            padding: "0 8px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.55)",
            color: meta.ink,
            fontWeight: 800,
            fontSize: 13,
            display: "inline-grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {items.length}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          paddingRight: 4,
          marginRight: -4,
        }}
      >
        {items.length === 0 ? (
          <span
            style={{
              fontSize: 13,
              color: meta.ink,
              opacity: 0.45,
              fontStyle: "italic",
            }}
          >
            nothing here
          </span>
        ) : (
          items.map((t, i) => {
            const isFocus = t.order === focusKey;
            return (
              <button
                key={t.order}
                type="button"
                onClick={() => setFocusKey(isFocus ? null : t.order)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  textAlign: "left",
                  padding: "6px 10px",
                  background: isFocus
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(255,255,255,0.55)",
                  border: `1px solid ${isFocus ? meta.ink : "transparent"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: meta.ink,
                  flexShrink: 0,
                  animation: `pg-rise .3s ease ${0.04 + i * 0.03}s both`,
                  transition:
                    "background .15s ease, border-color .15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isFocus)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  if (!isFocus)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.55)";
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 100,
                    background: meta.ink,
                    color: "#fff",
                    flexShrink: 0,
                    marginTop: 1,
                    letterSpacing: 0.3,
                  }}
                >
                  M{t.meaning}·E{t.expertise}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.35, flex: 1 }}>
                  {t.text}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function StepPlot({
  onNext,
  onBack,
  onAddMore,
}: {
  onNext: () => void;
  onBack: () => void;
  onAddMore?: () => void;
}) {
  const { state } = useAssessment();
  const [focusKey, setFocusKey] = useState<number | null>(null);

  const byQuad = useMemo(() => {
    const out: Record<Quadrant, PlottedItem[]> = {
      growth: [],
      craft: [],
      routine: [],
      drain: [],
    };
    for (const it of state.items) {
      if (it.meaning == null || it.expertise == null || !it.text.trim()) continue;
      out[quadrantFor(it.meaning, it.expertise)].push({
        text: it.text.trim(),
        meaning: it.meaning,
        expertise: it.expertise,
        order: it.order,
      });
    }
    return out;
  }, [state.items]);

  const AXIS = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
    color: "var(--ink-muted)",
  };

  return (
    <PgFrame
      title="Here's what it looks like."
      bottom={
        <PgBottom
          onBack={onBack}
          onContinue={onNext}
          continueLabel="Reflect →"
          secondary={
            onAddMore && (
              <button className="pg-pill subtle" onClick={onAddMore}>
                + Add more tasks
              </button>
            )
          }
        />
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingLeft: 32,
            paddingRight: 4,
            flexShrink: 0,
            ...AXIS,
          }}
        >
          <span>← Low unique expertise</span>
          <span>High unique expertise →</span>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 22,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              paddingTop: 4,
              paddingBottom: 4,
              ...AXIS,
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              ↑ High meaning
            </span>
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              ↓ Low meaning
            </span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: 8,
            }}
          >
            {LAYOUT.map((q) => (
              <QuadrantTile
                key={q}
                q={q}
                items={byQuad[q]}
                focusKey={focusKey}
                setFocusKey={setFocusKey}
              />
            ))}
          </div>
        </div>
      </div>
    </PgFrame>
  );
}
