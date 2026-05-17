"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  quadrantFor,
  type AssessmentItem,
  type Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame } from "./PgShell";

/** Design-aligned quadrant meta — labels + tints/inks for the rate card
 *  bloom and the side legend. Keys match the canonical `Quadrant` type. */
const Q_META: Record<
  Quadrant,
  { name: string; short: string; tint: string; ink: string }
> = {
  craft: {
    name: "Your core craft",
    short: "Core craft",
    tint: "var(--q-craft)",
    ink: "var(--q-craft-ink)",
  },
  growth: {
    name: "Your growth edge",
    short: "Growth edge",
    tint: "var(--q-edge)",
    ink: "var(--q-edge-ink)",
  },
  drain: {
    name: "Skilled but draining",
    short: "Draining",
    tint: "var(--q-skill)",
    ink: "var(--q-skill-ink)",
  },
  routine: {
    name: "Routine tasks",
    short: "Routine",
    tint: "var(--q-routine)",
    ink: "var(--q-routine-ink)",
  },
};

const MEANING_RAMP = [
  { label: "drains me" },
  { label: "feels empty" },
  { label: "mostly neutral" },
  { label: "resonates" },
  { label: "lights me up" },
];
const EXPERTISE_RAMP = [
  { label: "anyone could" },
  { label: "many could" },
  { label: "some could" },
  { label: "few could" },
  { label: "only I could" },
];

function Scale({
  ramp,
  value,
  onChange,
  accent,
}: {
  ramp: { label: string }[];
  value: number | null;
  onChange: (n: number | null) => void;
  accent: string;
}) {
  return (
    <div style={{ position: "relative", padding: "0 18px" }}>
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          top: 17,
          height: 1,
          background: "var(--rule)",
        }}
      />
      {value != null && (
        <div
          style={{
            position: "absolute",
            left: 32,
            top: 17,
            height: 1,
            width: `calc((100% - 64px - 36px) * ${(value - 1) / 4})`,
            background: accent,
            transition: "width .25s ease",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {ramp.map((opt, i) => {
          const n = i + 1;
          const selected = value === n;
          const filled = value != null && value >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              aria-label={`${n} — ${opt.label}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                padding: "0 4px",
                cursor: "pointer",
                fontFamily: "inherit",
                flex: 1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 100,
                  background: selected ? accent : "var(--paper-bright)",
                  border: `1.5px solid ${
                    selected ? accent : filled ? accent : "var(--rule)"
                  }`,
                  color: selected ? "#fff" : filled ? accent : "var(--ink-muted)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  transition: "all .18s ease",
                  transform: selected ? "scale(1.06)" : "scale(1)",
                  boxShadow: selected ? `0 4px 14px -6px ${accent}` : "none",
                }}
              >
                {n}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  color: selected ? "var(--ink)" : "var(--ink-muted)",
                  letterSpacing: -0.1,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  transition: "color .15s, font-weight .15s",
                }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip3({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 100,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      {label}
    </span>
  );
}

function RateCard({
  idx,
  total,
  item,
  offset,
  flying,
  onScore,
}: {
  idx: number;
  total: number;
  item: AssessmentItem;
  offset: number;
  flying: boolean;
  onScore: (key: "meaning" | "expertise", value: number | null) => void;
}) {
  const isTop = offset === 0;
  const q =
    item.meaning != null && item.expertise != null
      ? quadrantFor(item.meaning, item.expertise)
      : null;
  const qMeta = q ? Q_META[q] : null;
  const both = q !== null;

  const stackTransform =
    offset === 0
      ? "translateY(0) scale(1)"
      : offset === 1
        ? "translateY(14px) scale(0.97)"
        : "translateY(28px) scale(0.94)";

  let transform = stackTransform;
  let opacity = offset === 0 ? 1 : offset === 1 ? 0.65 : 0.32;
  let transition =
    "transform .35s cubic-bezier(.22,1.2,.36,1), opacity .35s ease, box-shadow .25s ease";

  if (flying) {
    transform = "translate(110%, -6%) rotate(10deg) scale(0.96)";
    opacity = 0;
    transition = "transform .42s cubic-bezier(.5,0,.7,.2), opacity .35s";
  }

  return (
    <div
      style={{
        position: isTop ? "relative" : "absolute",
        top: isTop ? undefined : 0,
        left: isTop ? undefined : 0,
        right: isTop ? undefined : 0,
        transform,
        opacity,
        transition,
        pointerEvents: isTop && !flying ? "auto" : "none",
        zIndex: 10 - offset,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "var(--paper-bright)",
          border: "1px solid var(--line-soft)",
          borderRadius: 22,
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: isTop
            ? "var(--shadow-card)"
            : "0 10px 24px -18px rgba(60,52,30,0.18)",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Quadrant tint bloom */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 4,
            background: qMeta ? qMeta.tint : "transparent",
            opacity: both ? 1 : 0,
            transition: "opacity .35s ease",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: qMeta
              ? `linear-gradient(180deg, ${qMeta.tint} 0%, transparent 40%)`
              : "transparent",
            opacity: both ? 0.35 : 0,
            transition: "opacity .35s ease",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
              Item {String(idx + 1).padStart(2, "0")}
              <span style={{ color: "var(--ink-faint)" }}> · of {total}</span>
            </span>
            {qMeta && both && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: qMeta.ink,
                  background: "rgba(255,255,255,0.65)",
                  padding: "6px 12px",
                  borderRadius: 100,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  animation: "pg-pop .35s cubic-bezier(.22,1.2,.36,1)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 100,
                    background: qMeta.ink,
                  }}
                />
                {qMeta.name}
              </span>
            )}
          </div>

          <h2
            className="serif"
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.2,
              letterSpacing: -0.3,
            }}
          >
            {item.text}
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
              >
                Meaning
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                how much does this matter to you
              </span>
            </div>
            <Scale
              ramp={MEANING_RAMP}
              value={item.meaning}
              onChange={(v) => onScore("meaning", v)}
              accent="var(--m-accent)"
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
              >
                Unique expertise
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                how rare is your context in your org
              </span>
            </div>
            <Scale
              ramp={EXPERTISE_RAMP}
              value={item.expertise}
              onChange={(v) => onScore("expertise", v)}
              accent="var(--e-accent)"
            />
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 22,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              {item.meaning == null && item.expertise == null && (
                <>
                  Tap a number to begin{" "}
                  <span style={{ opacity: 0.6 }}>
                    · or press <kbd>1</kbd>–<kbd>5</kbd>
                  </span>
                </>
              )}
              {item.meaning != null && item.expertise == null && (
                <>Now: how rare is your context?</>
              )}
              {item.meaning == null && item.expertise != null && (
                <>Now: how meaningful is this?</>
              )}
              {both && qMeta && (
                <span style={{ color: qMeta.ink, fontWeight: 600 }}>
                  Lands in <strong>{qMeta.name}</strong>. Sliding to the next…
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {item.meaning != null && (
                <Chip3 label={`M·${item.meaning}`} color="var(--m-accent)" />
              )}
              {item.expertise != null && (
                <Chip3 label={`E·${item.expertise}`} color="var(--e-accent)" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StepRate({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, update } = useAssessment();

  // We only iterate items that have text (the brain-dump filtered list).
  const items = useMemo(
    () => state.items.filter((it) => it.text.trim()),
    [state.items],
  );
  const total = items.length;

  const [idx, setIdx] = useState(() => {
    const i = items.findIndex(
      (it) => it.meaning == null || it.expertise == null,
    );
    return i === -1 ? Math.max(0, total - 1) : i;
  });
  const [flying, setFlying] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTouchedRef = useRef(false);

  const cur = items[idx];
  const both = cur && cur.meaning != null && cur.expertise != null;

  const advance = useCallback(() => {
    if (flying) return;
    if (idx >= total - 1) {
      setTimeout(() => onNext(), 350);
      return;
    }
    setFlying(true);
    setTimeout(() => {
      setIdx((i) => Math.min(i + 1, total - 1));
      setFlying(false);
    }, 380);
  }, [flying, idx, total, onNext]);

  useEffect(() => {
    if (both && !flying && userTouchedRef.current) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(advance, 750);
    }
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [both, flying, advance]);

  // Reset the touched flag whenever the visible card changes.
  useEffect(() => {
    userTouchedRef.current = false;
  }, [idx]);

  function setScore(key: "meaning" | "expertise", value: number | null) {
    if (!cur) return;
    userTouchedRef.current = true;
    const order = cur.order;
    const newItems = state.items.map((it) =>
      it.order === order ? { ...it, [key]: value } : it,
    );
    update({ items: newItems });
  }

  function undo() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setFlying(false);
    userTouchedRef.current = false;
    if (idx === 0) {
      // Clear scores on the current item
      const cleared = state.items.map((it) =>
        it.order === cur.order ? { ...it, meaning: null, expertise: null } : it,
      );
      update({ items: cleared });
      return;
    }
    const prev = items[idx - 1];
    setIdx((i) => i - 1);
    const cleared = state.items.map((it) =>
      it.order === prev.order ? { ...it, meaning: null, expertise: null } : it,
    );
    update({ items: cleared });
  }

  function skip() {
    if (flying || idx >= total - 1) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advance();
  }

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")
      )
        return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5 && cur) {
        if (cur.meaning == null) setScore("meaning", n);
        else if (cur.expertise == null) setScore("expertise", n);
      } else if (e.key === "ArrowLeft" || e.key === "u" || e.key === "U") {
        undo();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Tallies for the side legend
  const tallies = useMemo(() => {
    const t: Record<Quadrant, number> = {
      craft: 0,
      growth: 0,
      routine: 0,
      drain: 0,
    };
    for (const it of items) {
      if (it.meaning != null && it.expertise != null) {
        t[quadrantFor(it.meaning, it.expertise)]++;
      }
    }
    return t;
  }, [items]);
  const completedCount =
    tallies.craft + tallies.growth + tallies.routine + tallies.drain;

  if (total === 0) {
    return (
      <PgFrame
        title="Nothing to rate."
        subhead="Head back and pick at least a few items to score."
        bottom={
          <button className="pg-pill ghost" onClick={onBack}>
            ← Back
          </button>
        }
      >
        <div />
      </PgFrame>
    );
  }

  const visibleCardOffsets = [0, 1, 2].filter((o) => idx + o < total);

  function goTo(target: number) {
    if (target < 0 || target >= total || target === idx) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setFlying(false);
    userTouchedRef.current = false;
    setIdx(target);
  }

  return (
    <PgFrame
      title="Score each task. Trust your gut."
      bottom={
        <>
          <button className="pg-pill ghost" onClick={onBack}>
            ← Back
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous card"
              style={{
                width: 34,
                height: 34,
                borderRadius: 100,
                background: "transparent",
                border: "1.5px solid var(--line)",
                color: idx === 0 ? "var(--ink-faint)" : "var(--ink-muted)",
                fontFamily: "inherit",
                cursor: idx === 0 ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: idx === 0 ? 0.5 : 1,
              }}
            >
              ←
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "0 6px",
              }}
            >
              {items.map((it, i) => {
                const isCur = i === idx;
                const isScored = it.meaning != null && it.expertise != null;
                return (
                  <button
                    key={it.order}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Card ${i + 1}${isScored ? " (scored)" : ""}`}
                    style={{
                      width: isCur ? 22 : 8,
                      height: 8,
                      borderRadius: 100,
                      background: isCur
                        ? "var(--forest)"
                        : isScored
                          ? "var(--moss)"
                          : "var(--line)",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition:
                        "width .2s ease, background .15s ease, transform .12s ease",
                    }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => goTo(idx + 1)}
              disabled={idx >= total - 1}
              aria-label="Next card"
              style={{
                width: 34,
                height: 34,
                borderRadius: 100,
                background: "transparent",
                border: "1.5px solid var(--line)",
                color:
                  idx >= total - 1 ? "var(--ink-faint)" : "var(--ink-muted)",
                fontFamily: "inherit",
                cursor: idx >= total - 1 ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: idx >= total - 1 ? 0.5 : 1,
              }}
            >
              →
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="pg-pill primary"
              onClick={onNext}
              disabled={completedCount === 0}
            >
              See your matrix →
            </button>
          </div>
        </>
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 24,
          alignItems: "stretch",
          justifyContent: "center",
        }}
      >
        {/* Card stack */}
        <div
          style={{
            position: "relative",
            flex: "1 1 720px",
            maxWidth: 720,
            minWidth: 0,
            alignSelf: "flex-start",
          }}
        >
          {visibleCardOffsets.map((o) => {
            const i = idx + o;
            const item = items[i];
            return (
              <RateCard
                key={item.order}
                idx={i}
                total={total}
                item={item}
                offset={o}
                flying={o === 0 && flying}
                onScore={(k, v) => o === 0 && setScore(k, v)}
              />
            );
          })}
        </div>

        {/* Side legend */}
        <aside
          style={{
            width: 180,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            {completedCount} of {total} scored
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(["craft", "growth", "drain", "routine"] as Quadrant[]).map((qid) => {
              const meta = Q_META[qid];
              const n = tallies[qid];
              const has = n > 0;
              return (
                <div
                  key={qid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: has ? meta.tint : "transparent",
                    border: `1px solid ${has ? "transparent" : "var(--line-soft)"}`,
                    transition: "all .25s",
                  }}
                >
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      padding: "0 6px",
                      borderRadius: 100,
                      background: has ? meta.ink : "var(--line)",
                      color: "#fff",
                      display: "inline-grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {n}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: has ? meta.ink : "var(--ink-faint)",
                    }}
                  >
                    {meta.short}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </PgFrame>
  );
}
