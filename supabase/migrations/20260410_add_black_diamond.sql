-- Black Diamond VIP flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_black_diamond boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS black_diamond_claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_black_diamond ON public.profiles(is_black_diamond) WHERE is_black_diamond = true;
