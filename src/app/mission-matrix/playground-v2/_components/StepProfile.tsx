"use client";

import { useState, type ReactNode } from "react";
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
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const tier = state.tier ?? "base";
  const inviteCode = state.invite_code ?? "";

  const ready =
    !!state.career_stage &&
    !!state.function_area &&
    state.role_title.trim().length > 0 &&
    !!state.team_size_managed &&
    state.company_size !== "" &&
    state.years_experience !== "" &&
    // Extended requires a non-empty code at minimum — actual validity
    // is checked server-side on Continue.
    (tier === "base" || inviteCode.trim().length > 0);

  async function handleContinue() {
    if (tier === "base") {
      onNext();
      return;
    }
    // Extended — server-validate the code before letting the user in.
    // Extended users skip the Reference end-screen and unlock Step 7/8.
    setCodeChecking(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/invite/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
      };
      if (!data.valid) {
        setCodeError("That invite code isn't recognized. Double-check with whoever sent it to you.");
        return;
      }
      onNext();
    } catch {
      setCodeError("Couldn't check your code right now. Try again in a moment.");
    } finally {
      setCodeChecking(false);
    }
  }

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
            onClick={handleContinue}
            disabled={!ready || codeChecking}
            style={{ marginLeft: "auto" }}
          >
            {codeChecking ? "Checking code…" : "Continue →"}
          </button>
        </>
      }
    >
      {/* Experience picker — base vs extended. Default base; extended
          reveals an invite-code input and gates Continue on a
          server-side validation of the code. Designed to feel like a
          small footnote so public visitors don't feel gated. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "14px 16px",
          background: "var(--paper-bright)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink-soft)",
            }}
          >
            Which experience?
          </span>
          <button
            type="button"
            onClick={() => {
              update({ tier: "base", invite_code: "" });
              setCodeError(null);
            }}
            className="pg-pill subtle"
            style={{
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              background:
                tier === "base" ? "var(--forest-soft)" : "transparent",
              borderColor:
                tier === "base" ? "var(--moss)" : "var(--line)",
              color:
                tier === "base"
                  ? "var(--forest-deep)"
                  : "var(--ink-muted)",
            }}
          >
            Base — free
          </button>
          <button
            type="button"
            onClick={() => {
              update({ tier: "extended" });
              setCodeError(null);
            }}
            className="pg-pill subtle"
            style={{
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              background:
                tier === "extended"
                  ? "var(--forest-soft)"
                  : "transparent",
              borderColor:
                tier === "extended" ? "var(--moss)" : "var(--line)",
              color:
                tier === "extended"
                  ? "var(--forest-deep)"
                  : "var(--ink-muted)",
            }}
          >
            Extended — paid engagement
          </button>
        </div>
        {tier === "extended" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <input
              id="invite_code"
              className="pg-input"
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              autoComplete="off"
              onChange={(e) => {
                update({ invite_code: e.target.value });
                if (codeError) setCodeError(null);
              }}
            />
            {codeError && (
              <span style={{ fontSize: 12, color: "#7a1a1a" }}>
                {codeError}
              </span>
            )}
          </div>
        )}
      </div>
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
