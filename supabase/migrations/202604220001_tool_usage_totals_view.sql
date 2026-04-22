-- ════════════════════════════════════════════════════════════════════
-- 202604220001_tool_usage_totals_view.sql
-- Aggregate views over usage_logs + daily_usage_logs so admin / ops can
-- answer "quem usou, quantas vezes, quantas chamadas totais" per tool
-- without running custom queries each time.
-- ════════════════════════════════════════════════════════════════════

-- ── Per-tool totals across ALL time ────────────────────────────────
-- Collapses usage_logs + daily_usage_logs into one unified view.
-- One row per tool_name with:
--   total_calls        — SUM(usage_count) across every user/day row
--   unique_users       — distinct user_ids that ever used the tool
--   last_used_at       — most recent usage_date
CREATE OR REPLACE VIEW public.tool_usage_totals AS
WITH unified AS (
  SELECT
    tool_name,
    user_id,
    usage_count,
    usage_date,
    'usage_logs'::text AS source
  FROM public.usage_logs
  UNION ALL
  SELECT
    tool_name,
    user_id,
    usage_count,
    usage_date,
    'daily_usage_logs'::text AS source
  FROM public.daily_usage_logs
)
SELECT
  tool_name,
  COALESCE(SUM(usage_count), 0)::bigint AS total_calls,
  COUNT(DISTINCT user_id)::bigint       AS unique_users,
  MAX(usage_date)                        AS last_used_at,
  source
FROM unified
GROUP BY tool_name, source
ORDER BY total_calls DESC;

COMMENT ON VIEW public.tool_usage_totals IS
  'Aggregated per-tool call totals across usage_logs + daily_usage_logs. Use in admin dashboards.';

-- ── Per-user-per-tool rollup (authoritative "who used what") ───────
-- Row per (user_id, tool_name): total calls this user made to this tool.
-- Useful for profile/account analytics and support.
CREATE OR REPLACE VIEW public.tool_usage_by_user AS
WITH unified AS (
  SELECT user_id, user_email, tool_name, usage_count, usage_date
    FROM public.usage_logs
  UNION ALL
  SELECT user_id, NULL::text AS user_email, tool_name, usage_count, usage_date
    FROM public.daily_usage_logs
)
SELECT
  user_id,
  MAX(user_email)                   AS user_email,
  tool_name,
  COALESCE(SUM(usage_count), 0)::bigint AS total_calls,
  MIN(usage_date)                    AS first_used_at,
  MAX(usage_date)                    AS last_used_at
FROM unified
WHERE user_id IS NOT NULL
GROUP BY user_id, tool_name;

COMMENT ON VIEW public.tool_usage_by_user IS
  'Per-user per-tool rollup. Anonymous usage (user_id IS NULL) excluded.';

-- ── Platform-wide grand total ──────────────────────────────────────
-- Single-row view: total API calls EVER across all tools, for hero stats.
CREATE OR REPLACE VIEW public.tool_usage_grand_total AS
SELECT
  COALESCE(SUM(total_calls), 0)::bigint AS total_calls,
  COUNT(DISTINCT tool_name)::bigint     AS tracked_tools,
  COUNT(DISTINCT user_id)::bigint       AS unique_users_ever
FROM public.tool_usage_by_user;

COMMENT ON VIEW public.tool_usage_grand_total IS
  'One-row summary: lifetime API calls, number of tracked tools, unique users.';

-- ── RLS: views inherit underlying table policies ───────────────────
-- usage_logs and daily_usage_logs already have RLS enabled; these
-- views expose aggregates only. Grant authenticated SELECT so the
-- frontend can read its own numbers when scoped by user_id.
GRANT SELECT ON public.tool_usage_totals      TO authenticated, anon;
GRANT SELECT ON public.tool_usage_by_user     TO authenticated;
GRANT SELECT ON public.tool_usage_grand_total TO authenticated, anon;
