"use client";

import { useMemo, useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  FUNCTION_AREAS,
  quadrantFor,
  type AssessmentState,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame } from "./PgShell";

/**
 * Step 8 — Audition board, focused one-at-a-time.
 *
 * Top: a row of quadrant pills with item counts. Active pill takes the
 * quadrant tint; inactive sit on the cream paper bg.
 * Below: a single FocusedPanel for the active quadrant — tasks list +
 * inline AI suggestions + per-quadrant notes textarea.
 * Bottom: Back · Start over · "Download full assessment" (jumps to
 * Step 6 — the consent / PDF page).
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
    desc: "You bring the why; the AI brings the how.",
  },
  drain: {
    label: "Skills / templates",
    desc: "Package the context you've built into something reusable.",
  },
  routine: {
    label: "Automate — or eliminate",
    desc: "Fire and forget. Or — equally valid — stop doing it at all.",
  },
};

/** Tab order — craft first (Q1, most important), then counterclockwise. */
const ORDER: Quadrant[] = ["craft", "growth", "drain", "routine"];

/** Map quadrant → which state field holds its notes. Keeps the four
 *  Airtable columns we already configured (brainstorm_*). */
const NOTE_FIELD: Record<
  Quadrant,
  "brainstorm_craft" | "brainstorm_growth" | "brainstorm_routine" | "brainstorm_drain"
> = {
  craft: "brainstorm_craft",
  growth: "brainstorm_growth",
  routine: "brainstorm_routine",
  drain: "brainstorm_drain",
};

interface FocusedItem {
  text: string;
  order: number;
}

function QuadrantPill({
  q,
  meta,
  count,
  active,
  onClick,
}: {
  q: Quadrant;
  meta: QuadrantMeta;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        background: active ? meta.tint : "transparent",
        border: `1.5px solid ${active ? "transparent" : "var(--line)"}`,
        borderRadius: 100,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--paper-soft)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
      }}
    >
      <span
        style={{
          minWidth: 22,
          height: 22,
          borderRadius: 100,
          background: active ? meta.ink : "var(--paper-bright)",
          color: active ? "#fff" : "var(--ink-muted)",
          border: active ? "none" : "1px solid var(--line)",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 700 : 600,
          color: active ? meta.ink : "var(--ink-soft)",
        }}
      >
        {meta.name}
      </span>
    </button>
  );
}

function FocusedPanel({
  q,
  meta,
  arch,
  items,
  suggestions,
  onGenerate,
  loading,
  error,
  notes,
  onNotesChange,
}: {
  q: Quadrant;
  meta: QuadrantMeta;
  arch: ArchetypeMeta;
  items: FocusedItem[];
  suggestions: Record<string, string[]>;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const hasAny = items.some((t) => (suggestions[t.text] || []).length > 0);

  return (
    <section
      key={q}
      style={{
        background: meta.tint,
        borderRadius: 18,
        padding: "24px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        flex: 1,
        minHeight: 0,
        animation: "pg-rise .3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h3
            className="serif"
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: meta.ink,
              letterSpacing: -0.4,
            }}
          >
            {meta.name}
          </h3>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: meta.ink,
              opacity: 0.7,
              padding: "4px 10px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            {arch.label}
          </span>
        </div>
        <span style={{ fontSize: 12, color: meta.ink, opacity: 0.7 }}>
          {meta.subtitle}
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
          gap: 10,
          paddingRight: 6,
          marginRight: -6,
        }}
      >
        {items.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: meta.ink,
              opacity: 0.6,
              fontStyle: "italic",
            }}
          >
            Nothing landed here. Skip and come back if you want.
          </p>
        ) : (
          items.map((t) => {
            const sug = suggestions[t.text] || [];
            return (
              <div
                key={t.order}
                style={{
                  background: "rgba(255,255,255,0.6)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: meta.ink,
                    lineHeight: 1.3,
                  }}
                >
                  {t.text}
                </div>
                {sug.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {sug.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 13,
                          lineHeight: 1.45,
                          color: meta.ink,
                          background: "rgba(255,255,255,0.6)",
                          borderLeft: `2px solid ${meta.ink}55`,
                          padding: "8px 12px",
                          borderRadius: 6,
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(255,255,255,0.7)",
              border: `1.5px solid ${meta.ink}`,
              borderRadius: 100,
              color: meta.ink,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              transition: "background .15s",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.95)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.7)";
            }}
          >
            <span>{loading ? "…" : "✨"}</span>
            {loading
              ? "Generating…"
              : hasAny
                ? "Refresh suggestions"
                : "Get AI suggestions"}
          </button>
          {error && (
            <span style={{ fontSize: 12, color: meta.ink, opacity: 0.7 }}>
              {error}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: meta.ink,
            opacity: 0.7,
          }}
        >
          Your notes — what would you actually build?
        </label>
        <textarea
          className="pg-textarea"
          placeholder="Sketch the AI helpers you'd build for the items above…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          style={{
            minHeight: 56,
            background: "rgba(255,255,255,0.6)",
            borderColor: `${meta.ink}33`,
          }}
        />
      </div>
    </section>
  );
}

export default function StepAudition({
  onBack,
  onRestart,
  onJumpToConsent,
}: {
  onBack: () => void;
  onRestart: () => void;
  /** Wiring for the "Download full assessment" CTA — jumps to Step 6
   *  where the actual submit + download happens. */
  onJumpToConsent?: () => void;
}) {
  const { state, update } = useAssessment();
  const [active, setActive] = useState<Quadrant>(() => {
    const counts = countByQuadrant(state.items);
    // Default to the first non-empty quadrant in canonical order; fall
    // back to craft if every quadrant is empty.
    for (const q of ORDER) if (counts[q] > 0) return q;
    return "craft";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byQuadrant = useMemo(() => {
    const out: Record<Quadrant, FocusedItem[]> = {
      craft: [],
      growth: [],
      routine: [],
      drain: [],
    };
    for (const it of state.items) {
      if (it.meaning == null || it.expertise == null || !it.text.trim()) continue;
      out[quadrantFor(it.meaning, it.expertise)].push({
        text: it.text.trim(),
        order: it.order,
      });
    }
    return out;
  }, [state.items]);

  const counts: Record<Quadrant, number> = {
    craft: byQuadrant.craft.length,
    growth: byQuadrant.growth.length,
    routine: byQuadrant.routine.length,
    drain: byQuadrant.drain.length,
  };

  const idx = ORDER.indexOf(active);
  const goPrev = () => setActive(ORDER[(idx - 1 + ORDER.length) % ORDER.length]);
  const goNext = () => setActive(ORDER[(idx + 1) % ORDER.length]);

  const suggestions = state.suggestions_by_item ?? {};
  const notesField = NOTE_FIELD[active];
  const activeNotes = state[notesField] ?? "";

  async function generate() {
    const items = byQuadrant[active];
    if (items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const functionLabel = FUNCTION_AREAS.find(
        (f) => f.id === state.function_area,
      )?.label;
      const res = await fetch("/api/audition/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quadrant: active,
          items: items.map((t) => t.text),
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
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = (await res.json()) as {
        suggestions: Record<string, string[]>;
      };
      update({
        suggestions_by_item: { ...suggestions, ...body.suggestions },
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't generate — give it another try.",
      );
    } finally {
      setLoading(false);
    }
  }

  const aMeta = Q_META[active];
  const aArch = ARCHETYPES[active];

  return (
    <PgFrame
      title="Now — what would you actually build?"
      subhead="One quadrant at a time. Jot down the AI helpers — ask for a starter if you want."
      bottom={
        <>
          <button className="pg-pill ghost" onClick={onBack}>
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
              onClick={onRestart}
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
            {onJumpToConsent && (
              <button
                className="pg-pill primary"
                onClick={onJumpToConsent}
              >
                Download full assessment
              </button>
            )}
          </div>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {ORDER.map((q) => (
          <QuadrantPill
            key={q}
            q={q}
            meta={Q_META[q]}
            count={counts[q]}
            active={q === active}
            onClick={() => setActive(q)}
          />
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous quadrant"
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: "transparent",
              border: "1.5px solid var(--line)",
              color: "var(--ink-muted)",
              fontFamily: "inherit",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next quadrant"
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: "transparent",
              border: "1.5px solid var(--line)",
              color: "var(--ink-muted)",
              fontFamily: "inherit",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            →
          </button>
        </div>
      </div>

      <FocusedPanel
        q={active}
        meta={aMeta}
        arch={aArch}
        items={byQuadrant[active]}
        suggestions={suggestions}
        onGenerate={generate}
        loading={loading}
        error={error}
        notes={activeNotes}
        onNotesChange={(v) =>
          update({ [notesField]: v } as Partial<AssessmentState>)
        }
      />
    </PgFrame>
  );
}

function countByQuadrant(items: AssessmentState["items"]) {
  const counts: Record<Quadrant, number> = {
    craft: 0,
    growth: 0,
    routine: 0,
    drain: 0,
  };
  for (const it of items) {
    if (it.meaning == null || it.expertise == null || !it.text.trim()) continue;
    counts[quadrantFor(it.meaning, it.expertise)]++;
  }
  return counts;
}
