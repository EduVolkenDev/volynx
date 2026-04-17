-- ============================================================
-- VOLYNX — Gamification: Streaks + Badges + Realtime
-- Daily streak rewards, cross-product badges, live balance sync
-- ============================================================

-- ── 1. Daily streaks table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_streaks (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INT NOT NULL DEFAULT 0,
  longest_streak    INT NOT NULL DEFAULT 0,
  last_active_date  DATE,
  last_reward_date  DATE,
  total_rewards     NUMERIC NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_own_streaks" ON public.daily_streaks
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 2. Badges catalog (static definitions) ──────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,                    -- emoji or URL
  tier         TEXT DEFAULT 'bronze',   -- bronze | silver | gold | platinum
  criteria     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anyone_reads_badges" ON public.badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.badges (id, label, description, icon, tier, criteria) VALUES
  ('first_purchase',    'First Spark',          'Made your first purchase',              '✨', 'bronze',   '{"type":"first_purchase"}'),
  ('ecosystem_master',  'Ecosystem Master',     'Used 3 products in the same day',       '🌐', 'silver',   '{"type":"products_same_day","count":3}'),
  ('streak_7',          'Week Warrior',         '7-day streak',                           '🔥', 'silver',   '{"type":"streak","days":7}'),
  ('streak_30',         'Monthly Master',       '30-day streak',                          '🏆', 'gold',     '{"type":"streak","days":30}'),
  ('streak_100',        'Centurion',            '100-day streak',                         '💎', 'platinum', '{"type":"streak","days":100}'),
  ('power_user',        'Power User',           'Spent 100+ tokens',                      '⚡', 'silver',   '{"type":"tokens_spent","amount":100}'),
  ('whale',             'Whale',                'Spent 1000+ tokens',                     '🐋', 'gold',     '{"type":"tokens_spent","amount":1000}'),
  ('black_diamond_vip', 'Black Diamond',        'VIP founding member',                    '💎', 'platinum', '{"type":"manual"}')
ON CONFLICT (id) DO NOTHING;


-- ── 3. User badges (unlocked) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata     JSONB DEFAULT '{}'::JSONB,

  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_own_badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);


-- ── 4. Streak ping RPC ──────────────────────────────────────
-- Called once per day when a user does any meaningful action.
-- Increments streak if yesterday was active, resets if gap, awards bonus at milestones.
CREATE OR REPLACE FUNCTION public.ping_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today        DATE := CURRENT_DATE;
  v_row          public.daily_streaks%ROWTYPE;
  v_new_streak   INT;
  v_bonus        INT := 0;
  v_badge_id     TEXT := NULL;
BEGIN
  -- Get or create streak row
  SELECT * INTO v_row FROM public.daily_streaks WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.daily_streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (p_user_id, 1, 1, v_today);
    RETURN jsonb_build_object('streak', 1, 'bonus', 0, 'new_day', true);
  END IF;

  -- Same day — no change
  IF v_row.last_active_date = v_today THEN
    RETURN jsonb_build_object('streak', v_row.current_streak, 'bonus', 0, 'new_day', false);
  END IF;

  -- Consecutive day
  IF v_row.last_active_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    -- Gap — reset to 1
    v_new_streak := 1;
  END IF;

  -- Milestone bonuses (once per milestone)
  IF v_new_streak = 7 AND v_row.last_reward_date IS DISTINCT FROM v_today THEN
    v_bonus := 10; v_badge_id := 'streak_7';
  ELSIF v_new_streak = 30 AND v_row.last_reward_date IS DISTINCT FROM v_today THEN
    v_bonus := 30; v_badge_id := 'streak_30';
  ELSIF v_new_streak = 100 AND v_row.last_reward_date IS DISTINCT FROM v_today THEN
    v_bonus := 100; v_badge_id := 'streak_100';
  END IF;

  UPDATE public.daily_streaks
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(v_new_streak, v_row.longest_streak),
      last_active_date = v_today,
      last_reward_date = CASE WHEN v_bonus > 0 THEN v_today ELSE v_row.last_reward_date END,
      total_rewards = v_row.total_rewards + v_bonus,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Credit bonus tokens atomically
  IF v_bonus > 0 THEN
    PERFORM public.credit_tokens_atomic(
      p_user_id,
      v_bonus::NUMERIC,
      'bonus'::TEXT,
      format('Streak bonus: %s days', v_new_streak)::TEXT,
      'streak'::TEXT,
      jsonb_build_object('streak_days', v_new_streak, 'badge', v_badge_id)
    );

    -- Grant badge
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id, metadata)
      VALUES (p_user_id, v_badge_id, jsonb_build_object('streak_days', v_new_streak))
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'streak', v_new_streak,
    'bonus', v_bonus,
    'badge', v_badge_id,
    'longest', GREATEST(v_new_streak, v_row.longest_streak),
    'new_day', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ping_streak FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ping_streak FROM anon;
REVOKE ALL ON FUNCTION public.ping_streak FROM authenticated;


-- ── 5. Check & unlock badges based on current state ─────────
-- Idempotent: only unlocks if criteria met and not already unlocked
CREATE OR REPLACE FUNCTION public.check_and_unlock_badges(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens_spent NUMERIC;
  v_purchases    INT;
  v_products_today INT;
  v_unlocked     TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- First purchase
  SELECT COUNT(*) INTO v_purchases FROM public.purchase_events WHERE user_id = p_user_id AND status = 'completed';
  IF v_purchases >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'first_purchase')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_unlocked := array_append(v_unlocked, 'first_purchase'); END IF;
  END IF;

  -- Tokens spent totals
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_tokens_spent
  FROM public.token_transactions
  WHERE user_id = p_user_id AND type = 'spend';

  IF v_tokens_spent >= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'power_user')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_unlocked := array_append(v_unlocked, 'power_user'); END IF;
  END IF;

  IF v_tokens_spent >= 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'whale')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_unlocked := array_append(v_unlocked, 'whale'); END IF;
  END IF;

  -- Ecosystem master (3 products same day via distinct tool_name in last 24h)
  SELECT COUNT(DISTINCT CASE
    WHEN tool_name LIKE 'cvitae%' THEN 'cvitae'
    WHEN tool_name IN ('scanner','summary','vault','writing','decision','my-day') THEN 'daily'
    WHEN tool_name IN ('converter','image-scaler','image-suite','qr-gen') THEN 'lab'
    WHEN tool_name LIKE 'builder%' OR tool_name LIKE 'kit_%' THEN 'builder'
    ELSE NULL
  END) INTO v_products_today
  FROM public.token_transactions
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND type = 'spend';

  IF v_products_today >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'ecosystem_master')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_unlocked := array_append(v_unlocked, 'ecosystem_master'); END IF;
  END IF;

  RETURN v_unlocked;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_unlock_badges FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_unlock_badges FROM anon;
REVOKE ALL ON FUNCTION public.check_and_unlock_badges FROM authenticated;


-- ── 6. Enable Realtime on profiles (token_balance broadcasts) ──
-- This makes any UPDATE to profiles.token_balance emit a realtime event
-- that frontends subscribed to the user's row will receive instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Also enable realtime on user_badges so new badges pop up live
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
