"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AssessmentState } from "@/lib/mission-matrix-types";
import { emptyState } from "@/lib/mission-matrix-types";

const DEFAULT_STORAGE_KEY = "mm-assessment-v1";

interface Ctx {
  state: AssessmentState;
  update: (patch: Partial<AssessmentState>) => void;
  reset: () => void;
  /** True after the first read from storage finishes (or no-op on SSR). */
  hydrated: boolean;
  /**
   * POST (first call) or PATCH (subsequent) the current state to the
   * assessment API. Returns the assessment id, or null if no save
   * happened (e.g. error). Concurrent calls dedupe: while a POST is
   * in-flight, subsequent calls await the same promise.
   *
   * Callers that just want to capture progress (navigation triggers)
   * can fire-and-forget. Callers that need the id (download buttons)
   * await the result.
   */
  saveProgress: () => Promise<string | null>;
}

const AssessmentContext = createContext<Ctx | null>(null);

export function AssessmentProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const [state, setState] = useState<AssessmentState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);

  const storage =
    typeof window === "undefined"
      ? null
      : storageKey.includes("playground")
        ? window.localStorage
        : window.sessionStorage;

  // rehydrate from storage on mount
  useEffect(() => {
    try {
      const raw = storage?.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AssessmentState;
        if (parsed && Array.isArray(parsed.items)) {
          setState(parsed);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // persist on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      storage?.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore (quota / private mode)
    }
  }, [state, hydrated]);

  // ── saveProgress wiring ─────────────────────────────────────────
  // Refs that update synchronously so concurrent saveProgress() calls
  // see the latest assessmentId without waiting for a React render.
  const savedIdRef = useRef<string | null>(null);
  const inFlightPostRef = useRef<Promise<string | null> | null>(null);
  // Keep the ref in sync with hydrated state (e.g. coming back from a
  // reload that already has saved_assessment_id stored).
  useEffect(() => {
    savedIdRef.current = state.saved_assessment_id ?? null;
  }, [state.saved_assessment_id]);
  // Stash the latest state in a ref so saveProgress can read fresh
  // values without re-creating itself (and thus re-firing useEffects
  // that depend on it).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveProgress = useCallback(async (): Promise<string | null> => {
    const id = savedIdRef.current;
    if (id) {
      try {
        await fetch(`/api/assessment/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stateRef.current),
        });
      } catch (e) {
        // Swallow — we don't block navigation on save failures.
        console.warn("[assessment] PATCH failed", e);
      }
      return id;
    }
    // No id yet — POST. Dedupe concurrent first-time saves so we don't
    // create two rows.
    if (inFlightPostRef.current) return inFlightPostRef.current;
    const promise: Promise<string | null> = (async () => {
      try {
        const res = await fetch("/api/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stateRef.current),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || `Save failed (${res.status})`);
        }
        const { assessmentId } = (await res.json()) as {
          assessmentId: string;
        };
        savedIdRef.current = assessmentId;
        setState((s) => ({ ...s, saved_assessment_id: assessmentId }));
        return assessmentId;
      } catch (e) {
        console.warn("[assessment] POST failed", e);
        return null;
      } finally {
        inFlightPostRef.current = null;
      }
    })();
    inFlightPostRef.current = promise;
    return promise;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      update: (patch) => setState((s) => ({ ...s, ...patch })),
      reset: () => {
        try {
          storage?.removeItem(storageKey);
        } catch {}
        savedIdRef.current = null;
        inFlightPostRef.current = null;
        setState(emptyState());
      },
      saveProgress,
    }),
    [state, hydrated, saveProgress],
  );

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used inside AssessmentProvider");
  return ctx;
}
