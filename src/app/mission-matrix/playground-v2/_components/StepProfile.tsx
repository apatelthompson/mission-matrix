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
import { PgFrame, PgBottom } from "./PgShell";

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
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
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

export default function StepProfile({ onNext }: { onNext: () => void }) {
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
      title="A quick hello."
      subhead="A few details to ground the exercise — and to help us understand how this framework lands across different kinds of work. Nothing here is shared publicly."
      bottom={
        <PgBottom
          onContinue={ready ? onNext : undefined}
          continueDisabled={!ready}
        />
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 32,
          rowGap: 16,
          marginTop: 8,
          maxWidth: 720,
        }}
      >
        <Field label="What best describes your work?">
          <select
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

        <Field label="Function">
          <select
            className="pg-select"
            value={state.function_area ?? ""}
            onChange={(e) =>
              update({
                function_area: e.target.value as typeof state.function_area,
              })
            }
          >
            <option value="">Choose one…</option>
            {FUNCTION_AREAS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title">
          <input
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

        <Field label="Team size you manage">
          <select
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

        <Field label="Company size">
          <select
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

        <Field label="Years in this role">
          <select
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

        <Field label="Company" optional>
          <input
            className="pg-input"
            type="text"
            value={state.company_name}
            onChange={(e) => update({ company_name: e.target.value })}
          />
        </Field>

        <Field label="City or country" optional>
          <input
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
