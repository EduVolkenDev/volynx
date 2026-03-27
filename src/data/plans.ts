/**
 * VOLYNX — Centralized Plan Definitions
 * Single source of truth for plan IDs, hierarchy, and helpers.
 * Used by both Astro components and referenced by client-side scripts.
 */

export const PLAN_IDS = ["free", "launch", "pro", "studio", "teams", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Numeric rank for plan comparison — higher = more access */
export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  launch: 1,
  pro: 2,
  studio: 3,
  teams: 4,
  enterprise: 5,
};

/** Returns true if the user's plan meets or exceeds the required plan */
export function canAccess(userPlan: string, requiredPlan: PlanId): boolean {
  const userRank = PLAN_RANK[userPlan as PlanId] ?? 0;
  const reqRank = PLAN_RANK[requiredPlan] ?? 0;
  return userRank >= reqRank;
}

/** Returns true if the plan is any paid tier */
export function isPaid(plan: string): boolean {
  return plan !== "free" && PLAN_IDS.includes(plan as PlanId);
}
