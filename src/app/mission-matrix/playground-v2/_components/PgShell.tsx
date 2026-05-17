"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Shared shell for playground-v2:
 *  - PgStepper:  persistent top stepper, only the active step shows its label
 *  - PgFrame:    eyebrow + Recoleta H1 + subhead + body + bottom row
 *  - PgBottom:   standard back + continue bar
 *
 * Translated from the design bundle (HTML/CSS/JS) into typed React.
 * Inline styles kept (vs. CSS classes) to mirror the design's structure
 * 1:1 and to let any future polish happen close to the markup.
 */

export interface PgStepMeta {
  num: number;
  eyebrow: string;
  tag?: string;
  label: string;
}

export const PG_STEPS: PgStepMeta[] = [
  { num: 1, eyebrow: "About you", label: "Hello" },
  { num: 2, eyebrow: "Step A · Brain dump", label: "On your plate" },
  { num: 3, eyebrow: "Step B · Rate", label: "Two scores" },
  { num: 4, eyebrow: "Step C · Your 2×2", label: "Your matrix" },
  { num: 5, eyebrow: "Reflect", label: "Notice" },
  { num: 6, eyebrow: "Last step", label: "Your PDF" },
];

export function PgStepper({
  step,
  total,
  onJump,
}: {
  step: number;
  total: number;
  onJump: (n: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "20px 48px",
        borderBottom: "1px solid var(--line-soft)",
        flexShrink: 0,
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "var(--forest-deep)",
          letterSpacing: -0.2,
        }}
      >
        Mission Matrix{" "}
        <span
          style={{
            color: "var(--ink-faint)",
            fontWeight: 400,
            marginLeft: 4,
          }}
        >
          · playground
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {PG_STEPS.slice(0, total).map((s, i) => {
          const done = i + 1 < step;
          const cur = i + 1 === step;
          const ahead = i + 1 > step;
          return (
            <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => onJump(i + 1)}
                title={s.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 28,
                  padding: cur ? "0 14px" : "0 9px",
                  borderRadius: 100,
                  background: cur
                    ? "var(--forest)"
                    : done
                      ? "var(--forest-soft)"
                      : "transparent",
                  color: cur
                    ? "#fff"
                    : done
                      ? "var(--forest-deep)"
                      : "var(--ink-faint)",
                  border: `1px solid ${
                    cur ? "var(--forest)" : done ? "transparent" : "var(--line)"
                  }`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  fontFamily: "inherit",
                  transition: "all .22s ease",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 100,
                    background: cur
                      ? "rgba(255,255,255,0.22)"
                      : done
                        ? "var(--forest)"
                        : "transparent",
                    border: ahead ? "1px dashed var(--line)" : "none",
                    color: done ? "#fff" : "inherit",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {done ? "✓" : s.num}
                </span>
                {cur && <span style={{ whiteSpace: "nowrap" }}>{s.label}</span>}
              </button>
              {i < total - 1 && (
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 1,
                    background: i + 1 < step ? "var(--forest)" : "var(--line)",
                    opacity: i + 1 < step ? 0.5 : 1,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PgFrame({
  eyebrow,
  eyebrowMeta,
  title,
  subhead,
  children,
  bottom,
  narrow = false,
}: {
  eyebrow?: string;
  eyebrowMeta?: string;
  title: string;
  subhead?: string;
  children: ReactNode;
  bottom?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "28px 64px 24px",
        boxSizing: "border-box",
        animation: "pg-rise .3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: narrow ? 760 : 1180,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
          minHeight: 0,
        }}
      >
        {(eyebrow || eyebrowMeta) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {eyebrow && <span className="pg-eyebrow">{eyebrow}</span>}
            {eyebrowMeta && (
              <>
                <span style={{ color: "var(--ink-faint)" }}>·</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                  }}
                >
                  {eyebrowMeta}
                </span>
              </>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxWidth: 760,
            flexShrink: 0,
          }}
        >
          <h1
            className="serif"
            style={{
              margin: 0,
              fontSize: "clamp(32px, 3.6vw, 44px)",
              fontWeight: 700,
              color: "var(--forest-deep)",
              lineHeight: 1.05,
              letterSpacing: -0.8,
            }}
          >
            {title}
          </h1>
          {subhead && (
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                textWrap: "pretty" as CSSProperties["textWrap"],
              }}
            >
              {subhead}
            </p>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>

        {bottom && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 4,
              flexShrink: 0,
            }}
          >
            {bottom}
          </div>
        )}
      </div>
    </div>
  );
}

export function PgBottom({
  onBack,
  onContinue,
  continueLabel = "Continue →",
  continueDisabled,
  hint,
  secondary,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  hint?: string | null;
  secondary?: ReactNode;
}) {
  return (
    <>
      {onBack ? (
        <button className="pg-pill ghost" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginLeft: "auto",
        }}
      >
        {hint && (
          <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{hint}</span>
        )}
        {secondary}
        {onContinue && (
          <button
            className="pg-pill primary"
            onClick={onContinue}
            disabled={continueDisabled}
          >
            {continueLabel}
          </button>
        )}
      </div>
    </>
  );
}
