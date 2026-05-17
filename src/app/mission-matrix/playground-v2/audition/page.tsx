"use client";

import "../playground.css";
import { AssessmentProvider } from "../../assessment/_components/AssessmentContext";
import {
  Wizard,
  PLAYGROUND_V2_STORAGE_KEY,
  PART_II_START_STEP,
} from "../page";

/**
 * Deep-link entry into Part II — for return visitors. Mounts the same
 * wizard with the same storage key, but starts at the first Part II
 * step. If no rated items exist in storage, the wizard's hydration
 * effect bounces back to Step 1.
 */
export default function Page() {
  return (
    <AssessmentProvider storageKey={PLAYGROUND_V2_STORAGE_KEY}>
      <Wizard initialStep={PART_II_START_STEP} />
    </AssessmentProvider>
  );
}
