"use client";

import { useEffect, useState } from "react";
import "./playground.css";
import {
  AssessmentProvider,
  useAssessment,
} from "../assessment/_components/AssessmentContext";
import { PgStepper } from "./_components/PgShell";
import StepProfile from "./_components/StepProfile";
import StepStarters from "./_components/StepStarters";
import StepRate from "./_components/StepRate";
import StepPlot from "./_components/StepPlot";
import StepReflect from "./_components/StepReflect";
import StepConsent from "./_components/StepConsent";
import StepToolTypes from "./_components/StepToolTypes";
import StepAudition from "./_components/StepAudition";
import StepArchetypeReference from "./_components/StepArchetypeReference";
import StepInterview from "./_components/StepInterview";

const PLAYGROUND_V2_STORAGE_KEY = "mm-playground-v2";

/** Total visible steps in the top stepper. Part II (Tool Types,
 *  Audition) extends past this — the design only covers Steps 1–6,
 *  so Part II reuses the wizard but isn't in the stepper for now. */
const PART_I_TOTAL = 6;
const PART_II_START_STEP = 7;

function Wizard({ initialStep = 1 }: { initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const { state, hydrated, reset, saveProgress } = useAssessment();
  /**
   * Extended-tier opt-out for the AI interview at Step 2. When true,
   * Step 2 falls back to the manual seed-suggestion view (StepStarters).
   * Local-only — survives Back/Continue navigation inside the session
   * but resets if the user hits Start over. Once items are synthesized,
   * Step 2 also defaults to the manual editor so revisiting doesn't
   * restart the interview.
   */
  const [skipInterview, setSkipInterview] = useState(false);

  // /audition deep-link bounces to step 1 if no rated items exist.
  useEffect(() => {
    if (!hydrated || step < PART_II_START_STEP) return;
    const ratedCount = state.items.filter(
      (it) => it.text.trim() && it.meaning != null && it.expertise != null,
    ).length;
    if (ratedCount === 0) setStep(1);
  }, [step, state.items, hydrated]);

  const next = () => {
    setStep((s) => s + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    // Option B autosave: capture progress on every forward step so we
    // have the user's data even if they drop off before Download. Fire
    // and forget — saveProgress dedupes concurrent calls internally.
    void saveProgress();
  };
  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    void saveProgress();
  };
  const goToStarters = () => {
    setStep(2);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    void saveProgress();
  };
  const restart = () => {
    // AssessmentContext.reset() also clears saved_assessment_id +
    // saveProgress's in-memory refs — so the next saveProgress() call
    // POSTs a brand-new row instead of PATCHing the previous one.
    reset();
    setSkipInterview(false);
    setStep(1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const jump = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    void saveProgress();
  };

  return (
    <div className="pg2">
      {step <= PART_I_TOTAL && (
        <PgStepper step={step} total={PART_I_TOTAL} onJump={jump} />
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {step === 1 && <StepProfile onNext={next} onRestart={restart} />}
        {/* Step 2 branches for extended users:
            - Extended + no items yet + interview not skipped → Interview
            - Otherwise (base, or interview done, or skipped) → Starters */}
        {step === 2 &&
          state.tier === "extended" &&
          !skipInterview &&
          !state.items.some((it) => it.text.trim()) && (
            <StepInterview
              onNext={next}
              onBack={back}
              onSkipToManual={() => setSkipInterview(true)}
            />
          )}
        {step === 2 &&
          !(
            state.tier === "extended" &&
            !skipInterview &&
            !state.items.some((it) => it.text.trim())
          ) && <StepStarters onNext={next} onBack={back} />}
        {step === 3 && <StepRate onNext={next} onBack={back} />}
        {step === 4 && (
          <StepPlot
            onNext={next}
            onBack={back}
            onAddMore={goToStarters}
          />
        )}
        {step === 5 && <StepReflect onNext={next} onBack={back} />}
        {step === 6 && <StepConsent onBack={back} onContinue={next} />}
        {/* Step 7 branches on tier — base users see the archetype
            reference and the flow ends; extended users continue into
            Part II (Tool Types + Audition). */}
        {step === 7 && state.tier !== "extended" && (
          <StepArchetypeReference onBack={back} onRestart={restart} />
        )}
        {step === 7 && state.tier === "extended" && (
          <StepToolTypes onNext={next} onBack={back} />
        )}
        {step === 8 && state.tier === "extended" && (
          <StepAudition onBack={back} onRestart={restart} />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AssessmentProvider storageKey={PLAYGROUND_V2_STORAGE_KEY}>
      <Wizard />
    </AssessmentProvider>
  );
}

export { Wizard, PLAYGROUND_V2_STORAGE_KEY, PART_II_START_STEP };
