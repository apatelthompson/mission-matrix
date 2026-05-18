"use client";

import type { ReactNode } from "react";
import { useAssessment } from "../../assessment/_components/AssessmentContext";
import {
  CAREER_STAGES,
  COMPANY_SIZES,
  FUNCTION_AREAS,
  TEAM_SIZES,
  YEARS_EXPERIENCE,
} from "@/lib/mission-matrix-types";
import { PgFrame } from "./PgShell";

const TITLE_SUGGESTIONS = [
  "Chief Executive Officer",
  "Founder",
  "Co-founder",
  "Chief of Staff",
  "Chief Operating Officer",
  "VP Operations",
  "Head of Operations",
  "Operations Manager",
  "Chief People Officer",
  "VP People",
  "Head of HR",
  "People Partner",
  "Chief Financial Officer",
  "VP Finance",
  "Head of Finance",
  "Controller",
  "Chief Marketing Officer",
  "VP Marketing",
  "Head of Marketing",
  "Marketing Manager",
  "Chief Revenue Officer",
  "VP Sales",
  "Head of Sales",
  "Sales Director",
  "Account Executive",
  "VP Customer Success",
  "Head of Customer Success",
  "Customer Success Manager",
  "Head of Design",
  "Principal Designer",
  "Senior Product Designer",
  "Product Designer",
  "VP Product",
  "Head of Product",
  "Senior Product Manager",
  "Product Manager",
  "VP Engineering",
  "Engineering Manager",
  "Staff Engineer",
  "Senior Software Engineer",
];

function Field({
  htmlFor,
  label,
  optional,
  children,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink)",
        }}
      >
        {label}{" "}
        {optional && (
          <span
            style={{
              fontWeight: 500,
              color: "var(--ink-faint)",
            }}
          >
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function StepProfile({
  onNext,
  onRestart,
}: {
  onNext: () => void;
  /** When provided, renders a small "Start over" link in the bottom bar
   *  that clears all saved state + session caches. Useful for testers
   *  who keep hitting stale data from prior runs. */
  onRestart?: () => void;
}) {
  const { state, update } = useAssessment();

  const ready =
    !!state.career_stage &&
    !!state.function_area &&
    state.role_title.trim().length > 0 &&
    !!state.team_size_managed &&
    state.company_size !== "" &&
    state.years_experience !== "";

  return (
    <PgFrame
      narrow
      title="A quick hello."
      subhead="A few details to ground the exercise — and to help us understand how this framework lands across different kinds of work. Nothing here is shared publicly."
      bottom={
        <>
          {onRestart ? (
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
          ) : (
            <span />
          )}
          <button
            className="pg-pill primary"
            onClick={onNext}
            disabled={!ready}
            style={{ marginLeft: "auto" }}
          >
            Continue →
          </button>
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 32,
          rowGap: 16,
          marginTop: 8,
        }}
      >
        <Field htmlFor="career_stage" label="What best describes your work?">
          <select
            id="career_stage"
            className="pg-select"
            value={state.career_stage ?? ""}
            onChange={(e) =>
              update({
                career_stage: e.target.value as typeof state.career_stage,
              })
            }
          >
            <option value="">Choose one…</option>
            {CAREER_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="function_area" label="Function">
          <select
            id="function_area"
            className="pg-select"
            value={state.function_area ?? ""}
            onChange={(e) => {
              const nextFn = e.target.value as typeof state.function_area;
              // If they're switching function after items exist, the
              // brain dump's seed list needs to reset — otherwise it
              // shows the prior function's items as "custom rows".
              const hadItems = state.items.some((it) => it.text.trim());
              if (
                nextFn !== state.function_area &&
                hadItems &&
                // Don't blow away ratings if they only revisited the
                // dropdown without changing it
                state.function_area
              ) {
                update({ function_area: nextFn, items: [] });
              } else {
                update({ function_area: nextFn });
              }
            }}
          >
            <option value="">Choose one…</option>
            {FUNCTION_AREAS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="role_title" label="Title">
          <input
            id="role_title"
            className="pg-input"
            type="text"
            list="pg-title-suggestions"
            placeholder="Start typing — or pick from suggestions"
            value={state.role_title}
            onChange={(e) => update({ role_title: e.target.value })}
            autoComplete="off"
          />
          <datalist id="pg-title-suggestions">
            {TITLE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field htmlFor="team_size_managed" label="Team size you manage">
          <select
            id="team_size_managed"
            className="pg-select"
            value={state.team_size_managed ?? ""}
            onChange={(e) =>
              update({
                team_size_managed: e.target
                  .value as typeof state.team_size_managed,
              })
            }
          >
            <option value="">Choose one…</option>
            {TEAM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="company_size" label="Company size">
          <select
            id="company_size"
            className="pg-select"
            value={state.company_size}
            onChange={(e) =>
              update({
                company_size: e.target.value as typeof state.company_size,
              })
            }
          >
            <option value="">Choose one…</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="years_experience" label="Years in this role">
          <select
            id="years_experience"
            className="pg-select"
            value={state.years_experience}
            onChange={(e) =>
              update({
                years_experience: e.target
                  .value as typeof state.years_experience,
              })
            }
          >
            <option value="">Choose one…</option>
            {YEARS_EXPERIENCE.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="company_name" label="Company" optional>
          <input
            id="company_name"
            className="pg-input"
            type="text"
            value={state.company_name}
            onChange={(e) => update({ company_name: e.target.value })}
          />
        </Field>

        <Field htmlFor="location" label="City or country" optional>
          <input
            id="location"
            className="pg-input"
            type="text"
            value={state.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </Field>
      </div>
    </PgFrame>
  );
}
