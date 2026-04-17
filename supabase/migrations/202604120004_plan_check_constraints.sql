-- Add CHECK constraints to prevent invalid plan values
ALTER TABLE public.profiles ADD CONSTRAINT chk_plan CHECK (plan IN ('free', 'pro'));
ALTER TABLE public.profiles ADD CONSTRAINT chk_builder_plan CHECK (builder_plan IN ('free', 'launch', 'pro', 'studio', 'teams', 'enterprise'));
ALTER TABLE public.profiles ADD CONSTRAINT chk_daily_plan CHECK (daily_plan IN ('free', 'pro', 'diamond'));

-- Add CHECK on subscription status
ALTER TABLE public.subscriptions ADD CONSTRAINT chk_subscription_status CHECK (status IN ('active', 'canceled', 'unpaid', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'));

-- Add CHECK on voucher type
ALTER TABLE public.vouchers ADD CONSTRAINT chk_voucher_type CHECK (type IN ('generic', 'black_diamond', 'founder', 'vip_access', 'beta_access', 'launch_credit', 'token_pack', 'discount_code', 'daily_access', 'builder_bonus'));

-- Add FK on voucher_redemptions.user_id
DO $$ BEGIN
  ALTER TABLE public.voucher_redemptions ADD CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
