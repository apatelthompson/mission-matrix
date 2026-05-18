"use client";

import { useEffect, useMemo, useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import { findSeedRole, type SeedRole, type SeedTask } from "@/lib/mission-matrix-seeds";
import type {
  AssessmentItem,
  Quadrant,
} from "@/lib/mission-matrix-types";
import { PgFrame, PgBottom } from "./PgShell";

const MIN_FILLED = 5;
const INITIAL_SLOTS = 5;
const MAX_SLOTS = 20;

interface Slot {
  id: string;
  text: string;
}

/**
 * Pick ~7 suggestions from the seed library with a balanced spread
 * across quadrants — 2 craft + 2 growth + 2 routine + 1 drain. Skewing
 * away from drain on purpose: those items (the "I'm great at it but
 * it costs me" set) tend to land later in the matrix and feel a bit
 * pointed for an opening suggestion.
 */
function pickSuggestions(role: SeedRole | undefined): SeedTask[] {
  if (!role) return [];
  const byHint: Record<Quadrant, SeedTask[]> = {
    craft: [],
    growth: [],
    routine: [],
    drain: [],
  };
  for (const t of role.tasks) byHint[t.hint].push(t);
  return [
    ...byHint.craft.slice(0, 2),
    ...byHint.growth.slice(0, 2),
    ...byHint.routine.slice(0, 2),
    ...byHint.drain.slice(0, 1),
  ];
}

// ─── Suggestion chip ───────────────────────────────────────────────
function SuggestionChip({
  text,
  used,
  onPick,
}: {
  text: string;
  used: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      draggable={!used}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", text);
        e.dataTransfer.effectAllowed = "copy";
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.5";
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = used ? "0.4" : "1";
      }}
      onClick={() => {
        if (!used) onPick();
      }}
      disabled={used}
      title={used ? "Already on your plate" : "Click or drag onto your plate"}
      style={{
        textAlign: "left",
        padding: "10px 14px",
        background: used ? "var(--paper-soft)" : "var(--paper-bright)",
        border: `1px solid ${used ? "var(--line-soft)" : "var(--line)"}`,
        borderRadius: 12,
        cursor: used ? "default" : "grab",
        fontFamily: "inherit",
        fontSize: 14,
        lineHeight: 1.35,
        color: used ? "var(--ink-faint)" : "var(--ink-soft)",
        opacity: used ? 0.55 : 1,
        transition: "all .15s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (used) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--forest)";
        el.style.background = "var(--forest-soft)";
        el.style.color = "var(--forest-deep)";
      }}
      onMouseLeave={(e) => {
        if (used) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--line)";
        el.style.background = "var(--paper-bright)";
        el.style.color = "var(--ink-soft)";
      }}
    >
      {text}
    </button>
  );
}

// ─── Plate slot (number + input + clear) ───────────────────────────
function PlateSlot({
  index,
  text,
  onChange,
  onDrop,
  onClear,
  canRemove,
}: {
  index: number;
  text: string;
  onChange: (v: string) => void;
  onDrop: (v: string) => void;
  onClear: () => void;
  canRemove: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const payload = e.dataTransfer.getData("text/plain");
        if (payload) onDrop(payload);
        setDragOver(false);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 10,
        background: dragOver ? "var(--forest-soft)" : "transparent",
        border: `1.5px solid ${
          dragOver ? "var(--forest)" : "transparent"
        }`,
        transition: "background .15s ease, border-color .15s ease",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink-faint)",
          fontVariantNumeric: "tabular-nums",
          width: 22,
          flexShrink: 0,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Drag a suggestion or type your own…"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          lineHeight: 1.35,
          color: "var(--ink)",
          fontFamily: "inherit",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid var(--line)",
          borderRadius: 0,
          padding: "8px 4px",
          outline: "none",
          transition: "border-color .15s ease",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderBottomColor =
            "var(--forest)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.borderBottomColor =
            "var(--line)";
        }}
      />
      {(text || canRemove) && (
        <button
          type="button"
          onClick={onClear}
          aria-label={canRemove ? "Remove row" : "Clear text"}
          title={canRemove ? "Remove row" : "Clear text"}
          style={{
            width: 24,
            height: 24,
            borderRadius: 100,
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--ink-muted)",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1,
            cursor: "pointer",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Step ──────────────────────────────────────────────────────────
export default function StepStarters({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, update } = useAssessment();
  const role = findSeedRole(state.function_area ?? "");
  const suggestions = useMemo(() => pickSuggestions(role), [role]);

  const [slots, setSlots] = useState<Slot[]>(() => {
    const existing = state.items
      .filter((it) => it.text.trim())
      .map((it, i) => ({ id: `s${i}`, text: it.text.trim() }));
    const initial =
      existing.length > 0 ? existing : ([] as Slot[]);
    // Pad up to INITIAL_SLOTS empty rows
    while (initial.length < INITIAL_SLOTS) {
      initial.push({ id: `s${initial.length}-empty`, text: "" });
    }
    return initial;
  });

  // Sync slot text → state.items, preserving any prior scores by text match.
  useEffect(() => {
    const items: AssessmentItem[] = slots
      .filter((s) => s.text.trim())
      .map((s, i) => {
        const prior = state.items.find(
          (it) => it.text.trim() === s.text.trim(),
        );
        return {
          order: i + 1,
          text: s.text.trim(),
          meaning: prior?.meaning ?? null,
          expertise: prior?.expertise ?? null,
        };
      });
    update({ items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const filled = slots.filter((s) => s.text.trim()).length;
  const ready = filled >= MIN_FILLED;
  const usedTexts = useMemo(
    () => new Set(slots.map((s) => s.text.trim()).filter(Boolean)),
    [slots],
  );

  function setSlotText(idx: number, text: string) {
    setSlots((s) =>
      s.map((slot, i) => (i === idx ? { ...slot, text } : slot)),
    );
  }
  function clearSlot(idx: number) {
    // For rows above the initial 5, clearing removes the row entirely.
    // For the initial 5, clearing just empties the text so the slot stays.
    setSlots((s) => {
      if (s.length > INITIAL_SLOTS) return s.filter((_, i) => i !== idx);
      return s.map((slot, i) => (i === idx ? { ...slot, text: "" } : slot));
    });
  }
  function pickSuggestion(text: string) {
    setSlots((s) => {
      const emptyIdx = s.findIndex((slot) => !slot.text.trim());
      if (emptyIdx >= 0) {
        return s.map((slot, i) =>
          i === emptyIdx ? { ...slot, text } : slot,
        );
      }
      // No empty slot — append a new one
      if (s.length >= MAX_SLOTS) return s;
      return [...s, { id: `s${Date.now()}`, text }];
    });
  }
  function addEmptySlot() {
    setSlots((s) =>
      s.length >= MAX_SLOTS
        ? s
        : [...s, { id: `s${Date.now()}-empty`, text: "" }],
    );
  }

  return (
    <PgFrame
      title="What's on your plate?"
      subhead="Drag a suggestion onto your plate, or type your own. Start with 5 - 7. Come back anytime to add more."
      bottom={
        <PgBottom
          onBack={onBack}
          onContinue={ready ? onNext : undefined}
          continueDisabled={!ready}
          continueLabel="Score these →"
          hint={!ready ? `${filled} of ${MIN_FILLED} minimum` : null}
        />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 8,
          marginRight: -8,
        }}
      >
        {/* Suggestions */}
        {suggestions.length > 0 ? (
          <section
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "var(--forest)",
                }}
              >
                Suggestions for {role!.label}
              </h2>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                }}
              >
                Drag onto your plate, or click to add to the first empty slot
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 10,
              }}
            >
              {suggestions.map((s) => (
                <SuggestionChip
                  key={s.text}
                  text={s.text}
                  used={usedTexts.has(s.text)}
                  onPick={() => pickSuggestion(s.text)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section
            style={{
              padding: "14px 16px",
              background: "var(--paper-soft)",
              border: "1px dashed var(--line)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--ink-muted)",
              fontStyle: "italic",
            }}
          >
            No suggestions for this function yet — fill in the slots below
            with the work that's actually on your plate.
          </section>
        )}

        {/* Plate */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "var(--forest)",
              }}
            >
              Your plate
            </h2>
            <span
              style={{
                fontSize: 13,
                color: "var(--ink-muted)",
              }}
            >
              At least {MIN_FILLED}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {slots.map((slot, i) => (
              <PlateSlot
                key={slot.id}
                index={i}
                text={slot.text}
                onChange={(v) => setSlotText(i, v)}
                onDrop={(v) => setSlotText(i, v)}
                onClear={() => clearSlot(i)}
                canRemove={i >= INITIAL_SLOTS}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addEmptySlot}
            disabled={slots.length >= MAX_SLOTS}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              marginTop: 4,
              background: "transparent",
              border: "none",
              color:
                slots.length >= MAX_SLOTS
                  ? "var(--ink-faint)"
                  : "var(--ink-muted)",
              cursor: slots.length >= MAX_SLOTS ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              transition: "color .15s ease",
            }}
            onMouseEnter={(e) => {
              if (slots.length < MAX_SLOTS)
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--forest)";
            }}
            onMouseLeave={(e) => {
              if (slots.length < MAX_SLOTS)
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--ink-muted)";
            }}
          >
            + Add more
          </button>
        </section>
      </div>
    </PgFrame>
  );
}
