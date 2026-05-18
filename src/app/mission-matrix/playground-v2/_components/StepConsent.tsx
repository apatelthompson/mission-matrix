"use client";

import { useMemo, useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  quadrantFor,
  type AssessmentState,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame } from "./PgShell";

/**
 * Step 6 — Get your PDF (redesigned)
 *  - Left: a mini "preview" of the user's matrix (the artifact they're
 *    about to download)
 *  - Right: optional name + email + a single "help us refine" opt-in
 *  - One submit button. We POST the full state to /api/assessment and
 *    then open the PDF endpoint in a new tab.
 */

const Q_META: Record<
  Quadrant,
  { short: string; tint: string; ink: string }
> = {
  craft: { short: "Core craft", tint: "var(--q-craft)", ink: "var(--q-craft-ink)" },
  growth: { short: "Growth edge", tint: "var(--q-edge)", ink: "var(--q-edge-ink)" },
  drain: { short: "Draining", tint: "var(--q-skill)", ink: "var(--q-skill-ink)" },
  routine: { short: "Routine", tint: "var(--q-routine)", ink: "var(--q-routine-ink)" },
};

const LAYOUT: Quadrant[] = ["growth", "craft", "routine", "drain"];

function MatrixPreview({ state }: { state: AssessmentState }) {
  const { items, byQuad } = useMemo(() => {
    const items = state.items.filter(
      (it) => it.meaning != null && it.expertise != null && it.text.trim(),
    );
    const byQuad: Record<Quadrant, typeof items> = {
      craft: [],
      growth: [],
      routine: [],
      drain: [],
    };
    for (const it of items) {
      byQuad[quadrantFor(it.meaning!, it.expertise!)].push(it);
    }
    return { items, byQuad };
  }, [state.items]);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line-soft)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "var(--shadow-soft)",
        width: "100%",
        maxWidth: 320,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 100,
            background: "var(--moss)",
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          your-mission-matrix.pdf
        </span>
      </div>
      <div
        className="serif"
        style={{
          fontSize: 19,
          fontWeight: 700,
          color: "var(--forest-deep)",
          letterSpacing: -0.3,
          lineHeight: 1.15,
        }}
      >
        Your Mission Matrix
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
        {items.length} items · across 4 quadrants
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginTop: 4,
        }}
      >
        {LAYOUT.map((q) => {
          const meta = Q_META[q];
          const qItems = byQuad[q];
          return (
            <div
              key={q}
              style={{
                background: meta.tint,
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 84,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 10, fontWeight: 700, color: meta.ink }}
                >
                  {meta.short}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: meta.ink,
                    background: "rgba(255,255,255,0.5)",
                    padding: "1px 6px",
                    borderRadius: 100,
                  }}
                >
                  {qItems.length}
                </span>
              </div>
              {qItems.slice(0, 2).map((t) => (
                <div
                  key={t.order}
                  style={{
                    fontSize: 9,
                    color: meta.ink,
                    lineHeight: 1.3,
                    background: "rgba(255,255,255,0.55)",
                    padding: "4px 6px",
                    borderRadius: 4,
                  }}
                >
                  {t.text.length > 32 ? t.text.slice(0, 30) + "…" : t.text}
                </div>
              ))}
              {qItems.length > 2 && (
                <span
                  style={{
                    fontSize: 9,
                    fontStyle: "italic",
                    color: meta.ink,
                    opacity: 0.7,
                  }}
                >
                  + {qItems.length - 2} more
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptIn({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        textAlign: "left",
        padding: "16px 20px",
        background: checked ? "var(--forest-soft)" : "var(--paper-bright)",
        border: `1.5px solid ${checked ? "var(--moss)" : "var(--line)"}`,
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .15s ease",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: checked ? "var(--forest)" : "#fff",
          border: `1.5px solid ${checked ? "var(--forest)" : "var(--rule)"}`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7.5L5.8 10.2L11 4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--ink-muted)",
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {body}
        </div>
      </div>
    </button>
  );
}

export default function StepConsent({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  /** When provided, a "Continue to Part II →" CTA appears after a
   *  successful download — lets the user dive into the audition flow
   *  without having to dig out the /audition URL. */
  onContinue?: () => void;
}) {
  const { state, update, saveProgress } = useAssessment();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEmail = !!(state.email || "").trim();

  /**
   * Save logic now lives in AssessmentContext.saveProgress():
   *  - first call POSTs and stores the assessment id on state
   *  - subsequent calls PATCH the same row in place
   *  - concurrent calls dedupe via an in-flight Promise ref
   * Under Option B, autosave already runs on every step navigation, so
   * by the time the user reaches this step there's usually already a
   * saved row — handleDownload just patches with the latest values
   * (which now include name/email/consent) and opens the PDF.
   */
  async function handleDownload() {
    setSubmitting(true);
    setError(null);
    try {
      const id = await saveProgress();
      if (!id) throw new Error("Couldn't save your matrix — try again in a moment.");
      window.open(`/api/assessment/${id}/pdf`, "_blank");
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't save your matrix — try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    if (!onContinue) return;
    setSubmitting(true);
    setError(null);
    try {
      const id = await saveProgress();
      if (!id) throw new Error("Couldn't save your matrix — try again in a moment.");
      onContinue();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't save your matrix — try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PgFrame
      title="Your PDF is ready."
      subhead="Yours to keep, print, or come back to."
      bottom={
        <>
          <button
            className="pg-pill ghost"
            onClick={onBack}
            disabled={submitting}
          >
            ← Back
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginLeft: "auto",
            }}
          >
            <button
              className="pg-pill subtle"
              onClick={handleDownload}
              disabled={submitting}
            >
              {submitting
                ? "Saving…"
                : submitted
                  ? "✓ Download PDF ↓"
                  : "Download PDF ↓"}
            </button>
            {onContinue && (
              <button
                className="pg-pill primary"
                onClick={handleContinue}
                disabled={submitting}
              >
                Continue to Part II — Audition AI →
              </button>
            )}
          </div>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          gap: 36,
          marginTop: 8,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            Preview
          </span>
          <MatrixPreview state={state} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr",
                gap: 14,
              }}
            >
              <div>
                <label
                  htmlFor="pg-name"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Full name
                </label>
                <input
                  id="pg-name"
                  className="pg-input"
                  type="text"
                  placeholder="Your name"
                  value={state.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="pg-email"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Email{" "}
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--ink-faint)",
                      fontSize: 13,
                    }}
                  >
                    (we&apos;ll share future insights)
                  </span>
                </label>
                <input
                  id="pg-email"
                  className="pg-input"
                  type="email"
                  placeholder="you@example.com"
                  value={state.email}
                  onChange={(e) => update({ email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <OptIn
              checked={!!state.consent_research}
              onChange={(v) => update({ consent_research: v })}
              title="Help us refine the framework"
              body="Your responses are saved either way so we can generate your PDF. Check this if you're OK with us using them anonymously — never with your name attached — to make the Mission Matrix better for future users."
            />
          </div>

          {error && (
            <div
              style={{
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

          {submitted && (
            <div
              style={{
                padding: "14px 18px",
                background: "var(--forest-soft)",
                border: "1px solid var(--moss)",
                borderRadius: 12,
                fontSize: 14,
                color: "var(--forest-deep)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                animation: "pg-rise .3s ease",
              }}
            >
              <span style={{ fontSize: 20 }}>🎉</span>
              <span>
                Your PDF is downloading.
                {hasEmail && state.email ? (
                  <>
                    {" "}
                    We&apos;ll share future insights at{" "}
                    <strong>{state.email}</strong>.
                  </>
                ) : null}
              </span>
            </div>
          )}
        </div>
      </div>
    </PgFrame>
  );
}
