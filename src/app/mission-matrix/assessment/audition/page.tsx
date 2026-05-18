"use client";

import "../../playground-v2/playground.css";
import { AssessmentProvider } from "../_components/AssessmentContext";
import {
  Wizard,
  PLAYGROUND_V2_STORAGE_KEY,
  PART_II_START_STEP,
} from "../../playground-v2/page";

/**
 * Production deep-link into Part II — for return visitors who want to
 * pick up the audition flow without re-walking Part I. Same wizard,
 * same storage key as /mission-matrix/assessment, just starts at the
 * first Part II step. If no rated items exist in storage, the wizard
 * bounces back to Step 1.
 */
export default function Page() {
  return (
    <AssessmentProvider storageKey={PLAYGROUND_V2_STORAGE_KEY}>
      <Wizard initialStep={PART_II_START_STEP} />
    </AssessmentProvider>
  );
}
