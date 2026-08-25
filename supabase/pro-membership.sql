-- ===== COMMUNITY PRO MEMBERSHIP SYSTEM =====
-- Run this in Supabase SQL Editor

-- 1. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_payment_id text UNIQUE,
  provider_order_id text,
  provider_event_id text UNIQUE,
  amount integer NOT NULL DEFAULT 4900, -- paise
  currency text NOT NULL DEFAULT 'INR',
  payment_method text,
  status text CHECK (status IN ('pending', 'successful', 'failed', 'refunded')) DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. USER ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entitlement text NOT NULL DEFAULT 'community_pro',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text CHECK (status IN ('active', 'expired', 'revoked')) DEFAULT 'active',
  source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ADMIN CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default config
INSERT INTO public.admin_config (key, value) VALUES
  ('pro_plan', '{"price_paise": 4900, "currency": "INR", "duration_days": 30, "entitlement": "community_pro", "active": true}'::jsonb),
  ('pro_features', '{
    "free": ["join_public_groups", "basic_text_discussion", "basic_community_access"],
    "pro": ["create_private_groups", "advanced_group_management", "larger_group_limits", "advanced_collaboration", "shared_study_goals", "shared_group_task_planning", "rich_media_features", "advanced_voice_notes", "premium_community_tools"]
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.user_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_expires_at ON public.user_entitlements(expires_at);

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Payments: users can only see their own
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Entitlements: users can only see their own
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Admin config: everyone can read, no public write
CREATE POLICY "Anyone can view admin config" ON public.admin_config
  FOR SELECT USING (true);

-- 6. REALTIME
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['payments', 'user_entitlements'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- 7. FUNCTION: Check if user has active pro entitlement
CREATE OR REPLACE FUNCTION public.check_pro_status(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_entitlements
    WHERE user_id = p_user_id
      AND entitlement = 'community_pro'
      AND status = 'active'
      AND expires_at > now()
  );
$$;

-- 8. FUNCTION: Expire old entitlements (run periodically or on access)
CREATE OR REPLACE FUNCTION public.expire_old_entitlements()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.user_entitlements
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at <= now();
$$;
