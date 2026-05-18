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

const PLAYGROUND_V2_STORAGE_KEY = "mm-playground-v2";

/** Total visible steps in the top stepper. Part II (Tool Types,
 *  Audition) extends past this — the design only covers Steps 1–6,
 *  so Part II reuses the wizard but isn't in the stepper for now. */
const PART_I_TOTAL = 6;
const PART_II_START_STEP = 7;

function Wizard({ initialStep = 1 }: { initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const { state, hydrated, reset } = useAssessment();

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
  };
  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const goToStarters = () => {
    setStep(2);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const restart = () => {
    reset();
    // Also wipe the per-session save caches so a fresh run gets a new
    // Airtable row instead of trying to reuse a stale assessmentId from
    // a previous test session.
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("mm-saved-id-pt1");
        sessionStorage.removeItem("mm-saved-id-full");
      } catch {
        // sessionStorage can throw in some private-mode situations — fine
      }
    }
    setStep(1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const jump = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
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
        {step === 2 && <StepStarters onNext={next} onBack={back} />}
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
        {step === 7 && <StepToolTypes onNext={next} onBack={back} />}
        {step === 8 && (
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
