import test from "node:test";
import assert from "node:assert/strict";
import { resolveDailyPlanGrant } from "../_shared/voucher-entitlements.mjs";

const now = new Date("2026-10-19T12:00:00.000Z");

test("a 90-day Daily voucher expires 90 days after redemption", () => {
  assert.deepEqual(
    resolveDailyPlanGrant({ requestedPlan: "diamond", durationDays: 90, now }),
    { daily_plan: "diamond", daily_plan_expires_at: "2027-01-17T12:00:00.000Z" },
  );
});

test("a timed voucher extends an active paid Daily entitlement", () => {
  assert.deepEqual(
    resolveDailyPlanGrant({
      currentPlan: "pro",
      currentExpiresAt: "2026-11-01T12:00:00.000Z",
      requestedPlan: "diamond",
      durationDays: 30,
      now,
    }),
    { daily_plan: "diamond", daily_plan_expires_at: "2026-12-01T12:00:00.000Z" },
  );
});

test("an already-expired Daily plan does not extend from its past expiry", () => {
  assert.deepEqual(
    resolveDailyPlanGrant({
      currentPlan: "pro",
      currentExpiresAt: "2026-10-01T12:00:00.000Z",
      requestedPlan: "pro",
      durationDays: 1,
      now,
    }),
    { daily_plan: "pro", daily_plan_expires_at: "2026-10-20T12:00:00.000Z" },
  );
});

test("a permanent entitlement cannot accidentally be replaced by a timed voucher", () => {
  assert.throws(
    () => resolveDailyPlanGrant({ currentPlan: "diamond", requestedPlan: "diamond", durationDays: 90, now }),
    { message: "daily_plan_permanent_entitlement" },
  );
});

test("duration and plan values are validated", () => {
  for (const durationDays of [0, -1, 1.5, 3651, "abc"]) {
    assert.throws(
      () => resolveDailyPlanGrant({ requestedPlan: "pro", durationDays, now }),
      { message: "invalid_daily_plan_duration" },
    );
  }
  assert.throws(
    () => resolveDailyPlanGrant({ requestedPlan: "ultra", durationDays: 30, now }),
    { message: "invalid_daily_plan" },
  );
});

test("a permanent plan grant clears an old subscription expiry", () => {
  assert.deepEqual(
    resolveDailyPlanGrant({
      currentPlan: "pro",
      currentExpiresAt: "2026-11-01T12:00:00.000Z",
      requestedPlan: "diamond",
      now,
    }),
    { daily_plan: "diamond", daily_plan_expires_at: null },
  );
});
