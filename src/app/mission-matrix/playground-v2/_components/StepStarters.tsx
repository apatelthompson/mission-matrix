"use client";

import { useEffect, useRef, useState } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import { findSeedRole } from "@/lib/mission-matrix-seeds";
import type { AssessmentItem } from "@/lib/mission-matrix-types";
import { PgFrame, PgBottom } from "./PgShell";

const MIN_FILLED = 5;
const MAX_ITEMS = 20;

interface Row {
  id: string;
  text: string;
  selected: boolean;
  /** A "starter" came from the seed library and shouldn't be deletable;
   *  custom rows the user added get a delete affordance. */
  starter: boolean;
}

function PgCheck({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        background: checked ? "var(--forest)" : "var(--paper-bright)",
        border: `1.5px solid ${checked ? "var(--forest)" : "var(--rule)"}`,
        display: "grid",
        placeItems: "center",
        transition: "all .15s ease",
        flexShrink: 0,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 14 14"
        fill="none"
        style={{
          opacity: checked ? 1 : 0,
          transition: "opacity .12s ease",
        }}
      >
        <path
          d="M3 7.5L5.8 10.2L11 4"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TaskRow({
  text,
  checked,
  starter,
  onToggle,
  onEditText,
  onDelete,
}: {
  text: string;
  checked: boolean;
  starter: boolean;
  onToggle: () => void;
  onEditText: (next: string) => void;
  onDelete: () => void;
}) {
  // Row is a div (not a button) so clicking inside the input doesn't
  // toggle selection. The checkbox handles toggle on its own click.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "10px 14px",
        background: checked ? "var(--forest-soft)" : "transparent",
        border: `1px solid ${checked ? "#C7D3B5" : "transparent"}`,
        borderRadius: 10,
        transition: "background .15s ease, border-color .15s ease",
      }}
      onMouseEnter={(e) => {
        if (!checked)
          (e.currentTarget as HTMLDivElement).style.background =
            "var(--paper-soft)";
      }}
      onMouseLeave={(e) => {
        if (!checked)
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={checked ? "Uncheck" : "Check"}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <PgCheck checked={checked} />
      </button>
      <input
        type="text"
        value={text}
        onChange={(e) => onEditText(e.target.value)}
        placeholder="Edit this task or write your own…"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 15,
          lineHeight: 1.3,
          color: checked ? "var(--ink)" : "var(--ink-soft)",
          fontWeight: checked ? 500 : 400,
          fontFamily: "inherit",
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: 6,
          padding: "4px 8px",
          margin: "-4px -8px",
          transition: "background .12s ease, border-color .12s ease",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.background =
            "rgba(255,255,255,0.7)";
          (e.currentTarget as HTMLInputElement).style.borderColor =
            "var(--rule)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.background =
            "transparent";
          (e.currentTarget as HTMLInputElement).style.borderColor =
            "transparent";
        }}
      />
      {!starter && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove task"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            padding: "3px 8px",
            borderRadius: 100,
            border: "1px solid var(--line)",
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          your own
        </button>
      )}
    </div>
  );
}

export default function StepStarters({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, update } = useAssessment();
  const role = findSeedRole(state.function_area ?? "");

  const [rows, setRows] = useState<Row[]>(() => {
    const existingTexts = new Set(
      state.items.filter((it) => it.text.trim()).map((it) => it.text.trim()),
    );
    if (role) {
      const seeded: Row[] = role.tasks.map((t, i) => ({
        id: `s${i}`,
        text: t.text,
        selected: existingTexts.size === 0 ? true : existingTexts.has(t.text),
        starter: true,
      }));
      const seedTexts = new Set(role.tasks.map((t) => t.text));
      const customs: Row[] = [];
      let cIdx = 0;
      for (const it of state.items) {
        const t = it.text.trim();
        if (!t || seedTexts.has(t)) continue;
        customs.push({ id: `c${cIdx++}`, text: t, selected: true, starter: false });
      }
      return [...seeded, ...customs];
    }
    if (existingTexts.size > 0) {
      return state.items
        .filter((it) => it.text.trim())
        .map((it, i) => ({
          id: `c${i}`,
          text: it.text,
          selected: true,
          starter: false,
        }));
    }
    return [];
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCount = rows.filter((r) => r.selected && r.text.trim()).length;
  const ready = selectedCount >= MIN_FILLED;

  // Sync into shared state.items every change. Preserve any prior scores
  // by text match so going back from Rate doesn't lose ratings.
  useEffect(() => {
    const items: AssessmentItem[] = rows
      .filter((r) => r.selected && r.text.trim())
      .map((r, i) => {
        const prior = state.items.find(
          (it) => it.text.trim() === r.text.trim(),
        );
        return {
          order: i + 1,
          text: r.text.trim(),
          meaning: prior?.meaning ?? null,
          expertise: prior?.expertise ?? null,
        };
      });
    update({ items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function toggle(i: number) {
    setRows((rs) =>
      rs.map((r, j) => (j === i ? { ...r, selected: !r.selected } : r)),
    );
  }
  function editText(i: number, text: string) {
    // Editing a seed row converts it to a custom row — once it's been
    // edited it's functionally the user's own, and we want it deletable.
    setRows((rs) =>
      rs.map((r, j) => (j === i ? { ...r, text, starter: false } : r)),
    );
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }
  function addCustom() {
    const text = draft.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    if (rows.length >= MAX_ITEMS) {
      setDraft("");
      setAdding(false);
      return;
    }
    setRows((rs) => [
      ...rs,
      { id: `c${Date.now()}`, text, selected: true, starter: false },
    ]);
    setDraft("");
    setAdding(false);
  }

  return (
    <PgFrame
      title="What's on your plate?"
      subhead="Edit these thought starters or add your own. Start with 5–7. Come back anytime to add more."
      bottom={
        <PgBottom
          onBack={onBack}
          onContinue={ready ? onNext : undefined}
          continueDisabled={!ready}
          continueLabel="Score these →"
          hint={!ready ? `${selectedCount} of ${MIN_FILLED} minimum` : null}
        />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 8,
          marginRight: -8,
        }}
      >
        {rows.length === 0 && (
          <div
            style={{
              padding: "20px 14px",
              fontSize: 14,
              color: "var(--ink-muted)",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            We don&apos;t have starter tasks for this function yet — use
            <strong style={{ color: "var(--forest)" }}> + Add your own </strong>
            below to list the work that fills your typical week. Five or more
            to continue.
          </div>
        )}
        {rows.map((r, i) => (
          <TaskRow
            key={r.id}
            text={r.text}
            checked={r.selected}
            starter={r.starter}
            onToggle={() => toggle(i)}
            onEditText={(t) => editText(i, t)}
            onDelete={() => removeRow(i)}
          />
        ))}

        <div style={{ paddingTop: 6 }}>
          {adding ? (
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                ref={inputRef}
                autoFocus
                className="pg-input"
                placeholder="e.g. Drafting our next product narrative…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setDraft("");
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                className="pg-pill primary"
                onClick={addCustom}
                style={{ padding: "0 18px" }}
              >
                Add
              </button>
              <button
                className="pg-pill subtle"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                }}
                style={{ padding: "0 14px" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={rows.length >= MAX_ITEMS}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                color: "var(--ink-muted)",
                cursor: rows.length >= MAX_ITEMS ? "not-allowed" : "pointer",
                opacity: rows.length >= MAX_ITEMS ? 0.5 : 1,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                transition: "color .15s ease",
              }}
              onMouseEnter={(e) => {
                if (rows.length < MAX_ITEMS)
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--forest)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--ink-muted)";
              }}
            >
              + Add your own
            </button>
          )}
        </div>
      </div>
    </PgFrame>
  );
}
