export const PROFESSION_CATEGORIES = [
  "Operator / Exec",
  "Individual contributor",
  "Creative",
  "Consultant / Freelancer",
  "Founder",
  "Researcher",
  "Educator",
  "Healthcare",
  "Legal",
  "Finance",
  "Other",
] as const;
export type ProfessionCategory = (typeof PROFESSION_CATEGORIES)[number];

export const COMPANY_SIZES = [
  "Solo",
  "2-10",
  "11-50",
  "51-200",
  "200-1000",
  "1001-10,000",
  "10,000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const YEARS_EXPERIENCE = [
  "<2",
  "2-5",
  "5-10",
  "10-20",
  "20+",
] as const;
export type YearsExperience = (typeof YEARS_EXPERIENCE)[number];

/**
 * Career stage = how the person fits in the org structure, independent
 * of what function they work in. Kept clean (no mixed industries).
 */
export const CAREER_STAGES = [
  "Founder",
  "Executive / Senior leader",
  "People manager",
  "Individual contributor",
  "Creative lead",
  "Consultant / Advisor",
  "Educator / Coach",
  "Researcher",
  "Other",
] as const;
export type CareerStage = (typeof CAREER_STAGES)[number];

/**
 * Function = which discipline the work sits in.
 * Ids mirror SEED_ROLES ids in mission-matrix-seeds.ts so the starter-task
 * picker can key off a single value. Keep in sync if you add roles there.
 */
export const FUNCTION_AREAS = [
  { id: "ceo-founder", label: "Leadership / Executive" },
  { id: "operations", label: "Operations" },
  { id: "hr-people", label: "People / HR" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "customer-success", label: "Customer Success" },
  { id: "designer", label: "Design" },
  { id: "product-manager", label: "Product" },
  { id: "software-engineer", label: "Engineering" },
  { id: "other", label: "Other / Not listed" },
] as const;
export type FunctionAreaId = (typeof FUNCTION_AREAS)[number]["id"];

export const TEAM_SIZES = [
  "None (IC)",
  "1-3",
  "4-9",
  "10-25",
  "26-100",
  "100+",
] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export type Quadrant = "growth" | "craft" | "routine" | "drain";

export const QUADRANT_META: Record<
  Quadrant,
  { title: string; subtitle: string; bg: string; ink: string }
> = {
  growth: {
    title: "Your growth edge",
    subtitle: "High meaning · Low unique expertise",
    bg: "#e9e4f7",
    ink: "#2e1f5e",
  },
  craft: {
    title: "Your core craft",
    subtitle: "High meaning · High unique expertise",
    bg: "#d9ebd8",
    ink: "#1e3d1a",
  },
  routine: {
    title: "Routine tasks",
    subtitle: "Low meaning · Low unique expertise",
    bg: "#ffe3cc",
    ink: "#6b3a10",
  },
  drain: {
    title: "Skilled but draining",
    subtitle: "Low meaning · High unique expertise",
    bg: "#d7ebf5",
    ink: "#1a3a52",
  },
};

export interface AssessmentItem {
  /** 1-based order */
  order: number;
  text: string;
  meaning: number | null;   // 1–5
  expertise: number | null; // 1–5
}

export interface AssessmentState {
  // profile
  profession_category: ProfessionCategory | "";
  profession_other: string;
  role_title: string;
  company_size: CompanySize | "";
  years_experience: YearsExperience | "";
  company_name: string;
  location: string;
  // playground (optional — set by /playground and /playground-v2 only)
  role_id?: string;
  career_stage?: CareerStage | "";
  function_area?: FunctionAreaId | "";
  team_size_managed?: TeamSize | "";
  /** Set after a successful POST to /api/assessment. Subsequent saves
   *  PATCH this row instead of creating a new one. Persists across
   *  reloads via localStorage. */
  saved_assessment_id?: string;
  // Part II / Audition (playground-v2)
  brainstorm_craft?: string;
  brainstorm_growth?: string;
  brainstorm_routine?: string;
  brainstorm_drain?: string;
  /** Cached AI suggestions per item text — avoids re-billing the LLM */
  suggestions_by_item?: Record<string, string[]>;
  // items
  items: AssessmentItem[];
  // reflections
  reflection_1: string;
  reflection_2: string;
  reflection_3: string;
  // consent + delivery
  name: string;
  email: string;
  consent_research: boolean;
  consent_marketing: boolean;
  // meta
  started_at: number; // Date.now()
}

export function quadrantFor(meaning: number, expertise: number): Quadrant {
  const highM = meaning >= 4;
  const highE = expertise >= 4;
  if (highM && highE) return "craft";
  if (highM && !highE) return "growth";
  if (!highM && highE) return "drain";
  return "routine";
}

export function emptyState(): AssessmentState {
  return {
    profession_category: "",
    profession_other: "",
    role_title: "",
    company_size: "",
    years_experience: "",
    company_name: "",
    location: "",
    items: Array.from({ length: 7 }, (_, i) => ({
      order: i + 1,
      text: "",
      meaning: null,
      expertise: null,
    })),
    reflection_1: "",
    reflection_2: "",
    reflection_3: "",
    name: "",
    email: "",
    consent_research: false,
    consent_marketing: false,
    started_at: Date.now(),
  };
}
