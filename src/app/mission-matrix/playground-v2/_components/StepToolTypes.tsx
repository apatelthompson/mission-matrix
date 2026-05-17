"use client";

import type { Quadrant } from "@/lib/mission-matrix-types";
import { PgFrame, PgBottom } from "./PgShell";

/**
 * Step 7 — Part II intro.
 * Four AI archetypes (one per quadrant), no specific tool names — that
 * line of detail comes later. Layout matches the 2×2 matrix shape so
 * the mental map carries over from Step 4.
 */

interface QuadrantMeta {
  name: string;
  subtitle: string;
  tint: string;
  ink: string;
}
interface ArchetypeMeta {
  label: string;
  desc: string;
}

const Q_META: Record<Quadrant, QuadrantMeta> = {
  craft: {
    name: "Your core craft",
    subtitle: "High meaning · High unique expertise",
    tint: "var(--q-craft)",
    ink: "var(--q-craft-ink)",
  },
  growth: {
    name: "Your growth edge",
    subtitle: "High meaning · Low unique expertise",
    tint: "var(--q-edge)",
    ink: "var(--q-edge-ink)",
  },
  drain: {
    name: "Skilled but draining",
    subtitle: "Low meaning · High unique expertise",
    tint: "var(--q-skill)",
    ink: "var(--q-skill-ink)",
  },
  routine: {
    name: "Routine tasks",
    subtitle: "Low meaning · Low unique expertise",
    tint: "var(--q-routine)",
    ink: "var(--q-routine-ink)",
  },
};

const ARCHETYPES: Record<Quadrant, ArchetypeMeta> = {
  craft: {
    label: "Forcefield agent",
    desc: "A persistent agent that quietly handles noise around your work — so you show up present, in lead, bringing the expertise only you can bring.",
  },
  growth: {
    label: "Chat with strong memory",
    desc: "You bring the why; the AI brings the how. Tell it how you like to be challenged and where your gaps are. It becomes a thinking partner, not a vending machine.",
  },
  drain: {
    label: "Skills / templates",
    desc: "Package the context you've built into something reusable. You stay in the driver's seat; the AI handles the parts that drain you.",
  },
  routine: {
    label: "Automate — or eliminate",
    desc: "Fire and forget. Or — equally valid — stop doing it at all. Even automation costs management overhead; sometimes the right answer is elimination.",
  },
};

/** Matrix layout: top row = high meaning, bottom = low meaning. */
const LAYOUT: Quadrant[] = ["growth", "craft", "routine", "drain"];

export default function StepToolTypes({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <PgFrame
      title="One AI doesn't fit every kind of work."
      subhead="Each quadrant calls for a different shape of AI. Next, we'll match these to your actual work."
      bottom={
        <PgBottom
          onBack={onBack}
          onContinue={onNext}
          continueLabel="Match to your work →"
        />
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 12,
          marginTop: 4,
        }}
      >
        {LAYOUT.map((q) => {
          const meta = Q_META[q];
          const arch = ARCHETYPES[q];
          return (
            <div
              key={q}
              style={{
                background: meta.tint,
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <h3
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: meta.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {meta.name}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: meta.ink,
                    opacity: 0.7,
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.subtitle}
                </span>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px 6px 6px",
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: 100,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: meta.ink,
                    opacity: 0.7,
                    padding: "4px 10px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.55)",
                  }}
                >
                  AI archetype
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: meta.ink }}
                >
                  {arch.label}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: meta.ink,
                  opacity: 0.92,
                }}
              >
                {arch.desc}
              </p>
            </div>
          );
        })}
      </div>
    </PgFrame>
  );
}
