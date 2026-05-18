"use client";

import "../playground-v2/playground.css";
import { AssessmentProvider } from "./_components/AssessmentContext";
import {
  Wizard,
  PLAYGROUND_V2_STORAGE_KEY,
} from "../playground-v2/page";

/**
 * The live assessment URL — mounts the redesigned wizard that lives in
 * /playground-v2. Shares storage with /playground-v2 so a return visitor
 * who started in either entry point picks up where they left off.
 *
 * The legacy /assessment/_components/* (StepBrainDump, ProgressBar,
 * StepDone, etc.) are no longer used by this route; they're kept on
 * disk for now in case we need to roll back, but can be removed when
 * we're confident in the new design.
 */
export default function Page() {
  return (
    <AssessmentProvider storageKey={PLAYGROUND_V2_STORAGE_KEY}>
      <Wizard />
    </AssessmentProvider>
  );
}
