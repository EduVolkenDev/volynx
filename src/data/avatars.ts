/**
 * Avatar catalog (PT-2b)
 *
 * Single source of truth for the avatar picker. The same shape is mirrored
 * inside the `update-avatar` edge function for server-side validation —
 * keep both in sync when adding/removing avatars.
 *
 * Access rule:
 *   - bdOnly avatars require `is_black_diamond=true` (any base plan)
 *   - non-BD avatars require user's effective plan rank ≥ avatar.plan rank
 *   - "effective rank" = max(profile.plan, builder_plan, daily_plan, cvitae_plan)
 *
 * The catalog only references files that exist in /public/assets/bd-assets/.
 * If you add a new avatar file, append it here AND in the edge function.
 */

export interface AvatarMeta {
  /** Stable id stored in profiles.avatar_id. Append-only — never reuse. */
  id: string;
  /** Minimum plan to unlock (ignored when bdOnly=true). */
  plan: "free" | "launch" | "business" | "pro" | "diamond" | "studio" | "teams" | "enterprise";
  /** Image URL relative to site root. */
  src: string;
  /** Display label in the picker. Bilingual handled at render time. */
  label: string;
  /** True = only Black Diamond members can pick this avatar. */
  bdOnly?: boolean;
}

export const AVATAR_CATALOG: readonly AvatarMeta[] = [
  // ── Plan-tier avatars (gen 2 / *4.webp) ─────────────────────────────────
  { id: "free-1",     plan: "free",     src: "/assets/bd-assets/avatarfree4.webp",     label: "Free" },
  { id: "launch-1",   plan: "launch",   src: "/assets/bd-assets/avatarlaunch4.webp",   label: "Launch" },
  { id: "pro-1",      plan: "pro",      src: "/assets/bd-assets/avatarpro4.webp",      label: "Pro" },
  { id: "diamond-1",  plan: "diamond",  src: "/assets/bd-assets/avatardiamond4.webp",  label: "Diamond" },
  { id: "studio-1",   plan: "studio",   src: "/assets/bd-assets/avatarstudio4.webp",   label: "Studio" },
  { id: "teams-1",    plan: "teams",    src: "/assets/bd-assets/avatarteams4.webp",    label: "Teams" },

  // ── Black Diamond exclusive set (9 variants) ───────────────────────────
  { id: "bd-main",    plan: "free", bdOnly: true, src: "/assets/bd-assets/bd-main-avatar.webp", label: "BD Signature" },
  { id: "bd-1",       plan: "free", bdOnly: true, src: "/assets/bd-assets/avatarbd.webp",       label: "BD Variant 1" },
  { id: "bd-2",       plan: "free", bdOnly: true, src: "/assets/bd-assets/avatarbd2.webp",      label: "BD Variant 2" },
  { id: "bd-alt-1",   plan: "free", bdOnly: true, src: "/assets/bd-assets/bd-avatar1.webp",     label: "BD Crystal" },
  { id: "bd-alt-2",   plan: "free", bdOnly: true, src: "/assets/bd-assets/bd-avatar2.webp",     label: "BD Prism" },
  { id: "bd-alt-3",   plan: "free", bdOnly: true, src: "/assets/bd-assets/bd-avatar3.webp",     label: "BD Refraction" },
  { id: "bd-alt-4",   plan: "free", bdOnly: true, src: "/assets/bd-assets/bd-avatar4.webp",     label: "BD Spectrum" },
  { id: "bd-black",   plan: "free", bdOnly: true, src: "/assets/bd-assets/avatarblack.webp",    label: "BD Onyx" },
  { id: "bd-gold",    plan: "free", bdOnly: true, src: "/assets/bd-assets/avatargold.webp",     label: "BD Aurum" },
] as const;

/** Plan rank — must mirror PLAN_RANK in vx-plan.js / check-permission. */
const PLAN_RANK: Record<string, number> = {
  free: 0, launch: 1, business: 2, pro: 2, diamond: 2, studio: 3, teams: 4, enterprise: 5,
};

/** Returns avatars unlocked for a given user (plan + bd flag). */
export function getAvailableFor(userPlan: string, isBlackDiamond: boolean): AvatarMeta[] {
  const userRank = PLAN_RANK[(userPlan || "").toLowerCase()] ?? 0;
  return AVATAR_CATALOG.filter((a) => {
    if (a.bdOnly) return isBlackDiamond;
    return (PLAN_RANK[a.plan] ?? 99) <= userRank;
  });
}

/** Returns true if the avatar id is allowed for the user. Used for server-side validation. */
export function isAvatarAllowed(avatarId: string, userPlan: string, isBlackDiamond: boolean): boolean {
  const meta = AVATAR_CATALOG.find((a) => a.id === avatarId);
  if (!meta) return false;
  if (meta.bdOnly) return !!isBlackDiamond;
  const userRank = PLAN_RANK[(userPlan || "").toLowerCase()] ?? 0;
  const reqRank = PLAN_RANK[meta.plan] ?? 99;
  return userRank >= reqRank;
}

/** Default avatar when user has not picked one. BD users get bd-main; otherwise plan-default. */
export function defaultAvatarFor(plan: string, isBlackDiamond: boolean): AvatarMeta {
  if (isBlackDiamond) {
    return AVATAR_CATALOG.find((a) => a.id === "bd-main") || AVATAR_CATALOG[0];
  }
  const planLower = (plan || "free").toLowerCase();
  // Map business→pro, enterprise→teams since they share rank visually
  const planMap: Record<string, string> = {
    business: "pro",
    enterprise: "teams",
  };
  const targetPlan = planMap[planLower] || planLower;
  const exact = AVATAR_CATALOG.find((a) => a.id === `${targetPlan}-1`);
  return exact || AVATAR_CATALOG[0];
}

/** Look up an avatar by id. Returns null if not found. */
export function getAvatarById(id: string | null | undefined): AvatarMeta | null {
  if (!id) return null;
  return AVATAR_CATALOG.find((a) => a.id === id) || null;
}

/** Resolve the avatar to display: explicit pick → falls back to plan default. */
export function resolveAvatar(
  avatarId: string | null | undefined,
  plan: string,
  isBlackDiamond: boolean,
): AvatarMeta {
  if (avatarId) {
    const explicit = getAvatarById(avatarId);
    if (explicit && isAvatarAllowed(avatarId, plan, isBlackDiamond)) return explicit;
  }
  return defaultAvatarFor(plan, isBlackDiamond);
}
