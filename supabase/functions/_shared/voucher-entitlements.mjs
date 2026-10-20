/**
 * Resolve a Daily plan grant without allowing a time-limited voucher to
 * accidentally turn an existing permanent Daily entitlement into an expiring one.
 *
 * @param {{ currentPlan?: unknown, currentExpiresAt?: string | null, requestedPlan: unknown, durationDays?: unknown, now?: Date }} input
 * @returns {{ daily_plan: string, daily_plan_expires_at: string | null }}
 */
export function resolveDailyPlanGrant(input) {
  const allowedPlans = new Set(["free", "pro", "diamond"]);
  const requestedPlan = String(input?.requestedPlan || "").trim().toLowerCase();
  if (!allowedPlans.has(requestedPlan)) throw new Error("invalid_daily_plan");

  const durationProvided = input?.durationDays !== undefined && input?.durationDays !== null;
  if (!durationProvided) {
    return { daily_plan: requestedPlan, daily_plan_expires_at: null };
  }

  const durationDays = Number(input.durationDays);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    throw new Error("invalid_daily_plan_duration");
  }
  if (requestedPlan === "free") throw new Error("invalid_daily_plan_duration");

  const currentPlan = String(input?.currentPlan || "free").trim().toLowerCase();
  const currentExpiry = input?.currentExpiresAt ? new Date(input.currentExpiresAt) : null;
  if (currentPlan !== "free" && !currentExpiry) {
    throw new Error("daily_plan_permanent_entitlement");
  }
  if (currentExpiry && Number.isNaN(currentExpiry.getTime())) {
    throw new Error("invalid_current_daily_expiration");
  }

  const now = input?.now instanceof Date ? input.now : new Date();
  const startAt = currentPlan !== "free" && currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return {
    daily_plan: requestedPlan,
    daily_plan_expires_at: expiresAt.toISOString(),
  };
}
