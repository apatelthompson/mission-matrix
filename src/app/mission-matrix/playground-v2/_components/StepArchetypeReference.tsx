"use client";

import { useMemo } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  quadrantFor,
  type AssessmentItem,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { ARCHETYPES } from "@/lib/mission-matrix-archetypes";
import { PgFrame } from "./PgShell";

/**
 * Base-tier terminus.
 *
 * Renders after the user downloads their Part I PDF on Step 6. Shows
 * (a) their plotted matrix and (b) the four AI archetypes — the same
 * "how AI fits each quadrant" reference content used inside the
 * Part II PDF, but as a closing on-screen artifact for the free flow.
 *
 * Extended-tier users skip this screen and continue to Step 7 / 8.
 */

const Q_TINT: Record<Quadrant, { tint: string; ink: string }> = {
  craft: { tint: "var(--q-craft)", ink: "var(--q-craft-ink)" },
  growth: { tint: "var(--q-edge)", ink: "var(--q-edge-ink)" },
  routine: { tint: "var(--q-routine)", ink: "var(--q-routine-ink)" },
  drain: { tint: "var(--q-skill)", ink: "var(--q-skill-ink)" },
};

/** Tile layout mirrors the matrix overview elsewhere — growth top-left,
 *  craft top-right, routine bottom-left, drain bottom-right — so the
 *  visual mapping stays consistent across screens and the PDF. */
const LAYOUT: Quadrant[] = ["growth", "craft", "routine", "drain"];

export default function StepArchetypeReference({
  onBack,
  onRestart,
}: {
  onBack: () => void;
  onRestart: () => void;
}) {
  const { state } = useAssessment();

  const byQuad = useMemo(() => {
    const out: Record<Quadrant, AssessmentItem[]> = {
      craft: [],
      growth: [],
      routine: [],
      drain: [],
    };
    for (const it of state.items) {
      if (it.meaning == null || it.expertise == null || !it.text.trim())
        continue;
      out[quadrantFor(it.meaning, it.expertise)].push(it);
    }
    return out;
  }, [state.items]);

  return (
    <PgFrame
      title="The shape of AI, by quadrant."
      subhead="Each quadrant calls for a different kind of AI. Here's what fits where — and where your items landed."
      bottom={
        <>
          <button className="pg-pill ghost" onClick={onBack}>
            ← Back
          </button>
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    "Start over? This will clear everything you've entered.",
                  )
                ) {
                  return;
                }
                onRestart();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-muted)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "8px 4px",
                fontFamily: "inherit",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Start over
            </button>
          </div>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 8,
        }}
      >
        {LAYOUT.map((q) => {
          const meta = ARCHETYPES[q];
          const tint = Q_TINT[q];
          const items = byQuad[q];
          return (
            <div
              key={q}
              style={{
                background: tint.tint,
                borderRadius: 14,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <h3
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: 19,
                    fontWeight: 700,
                    color: tint.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {meta.quadrantName}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: tint.ink,
                    background: "rgba(255,255,255,0.55)",
                    padding: "2px 9px",
                    borderRadius: 100,
                  }}
                >
                  {items.length}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: tint.ink,
                  opacity: 0.7,
                }}
              >
                {meta.archetype}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: tint.ink,
                }}
              >
                {meta.archetypeDesc}
              </p>
              {items.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  {items.slice(0, 3).map((it) => (
                    <div
                      key={it.order}
                      style={{
                        fontSize: 12,
                        color: tint.ink,
                        background: "rgba(255,255,255,0.55)",
                        padding: "5px 9px",
                        borderRadius: 6,
                        lineHeight: 1.35,
                      }}
                    >
                      {it.text}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontStyle: "italic",
                        color: tint.ink,
                        opacity: 0.7,
                      }}
                    >
                      + {items.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Closing footer — soft handoff to the extended engagement. */}
      <div
        style={{
          marginTop: 22,
          padding: "16px 18px",
          background: "var(--forest-soft)",
          border: "1px solid var(--moss)",
          borderRadius: 12,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--forest-deep)",
        }}
      >
        This is where the base experience ends. Keep exploring by
        auditioning and building the right AI for each role — learn
        more by reaching out to{" "}
        <a
          href="mailto:avni@thisbeautifulchaos.org"
          style={{
            color: "var(--forest-deep)",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          avni@thisbeautifulchaos.org
        </a>
        .
      </div>
    </PgFrame>
  );
}
