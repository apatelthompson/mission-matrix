import type { Quadrant } from "./mission-matrix-types";

/**
 * Canonical descriptions for the four quadrant archetypes — the
 * "shape of AI" that fits each kind of work.
 *
 * Anywhere we display archetype copy (the audition step, the Part II
 * PDF, the base-tier end-of-flow Reference screen) should import from
 * here so wording changes flow through one edit, not three. Visual
 * styling (colors, layout) stays per-component.
 */

export interface ArchetypeMeta {
  /** Short title for the quadrant ("Your core craft" etc.) */
  quadrantName: string;
  /** Axis description for the quadrant. */
  subtitle: string;
  /** Name of the AI archetype that fits the work in this quadrant. */
  archetype: string;
  /** One-paragraph description of how AI shows up here. */
  archetypeDesc: string;
}

export const ARCHETYPES: Record<Quadrant, ArchetypeMeta> = {
  craft: {
    quadrantName: "Your core craft",
    subtitle: "High meaning · High unique expertise",
    archetype: "Forcefield agent",
    archetypeDesc:
      "A persistent agent that quietly handles noise around your work — so you show up present, in lead, bringing the expertise only you can bring.",
  },
  growth: {
    quadrantName: "Your growth edge",
    subtitle: "High meaning · Low unique expertise",
    archetype: "Chat with strong memory",
    archetypeDesc:
      "You bring the why; the AI brings the how. Use it to learn out loud and accelerate where you're still building.",
  },
  drain: {
    quadrantName: "Skilled but draining",
    subtitle: "Low meaning · High unique expertise",
    archetype: "Skills / templates",
    archetypeDesc:
      "Package the context you've built into something reusable — so the work runs without your full attention each time.",
  },
  routine: {
    quadrantName: "Routine tasks",
    subtitle: "Low meaning · Low unique expertise",
    archetype: "Automate — or eliminate",
    archetypeDesc:
      "Fire and forget. Or — equally valid — stop doing it at all. Don't spend your scarce attention here.",
  },
};
