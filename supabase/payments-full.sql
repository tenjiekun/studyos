-- ===== STUDYOS — COMPLETE PAYMENT SYSTEM =====
-- Run this ONE file in Supabase SQL Editor
-- It creates everything: memberships, payments, orders, transactions

-- ===== A. LEGACY TABLES (from pro-membership.sql) =====

-- 1. LEGACY PAYMENTS (kept for backwards compat)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_payment_id text UNIQUE,
  provider_order_id text,
  provider_event_id text UNIQUE,
  amount integer NOT NULL DEFAULT 4900,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text,
  status text CHECK (status IN ('pending', 'successful', 'failed', 'refunded')) DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. USER ENTITLEMENTS
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

-- 3. ADMIN CONFIG
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_config (key, value) VALUES
  ('pro_plan', '{"price_paise": 4900, "currency": "INR", "duration_days": 30, "entitlement": "community_pro", "active": true}'::jsonb),
  ('pro_features', '{
    "free": ["join_public_groups", "basic_text_discussion", "basic_community_access"],
    "pro": ["create_private_groups", "advanced_group_management", "larger_group_limits", "advanced_collaboration", "shared_study_goals", "shared_group_task_planning", "rich_media_features", "advanced_voice_notes", "premium_community_tools"]
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ===== B. PAYMENT SYSTEM V2 =====

-- 4. PLANS (server-side config)
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  duration_days integer NOT NULL DEFAULT 30,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_plans (plan_id, name, description, price_paise, currency, duration_days, active)
VALUES ('community_pro', 'Community Pro', '30 days of premium community features', 4900, 'INR', 30, true)
ON CONFLICT (plan_id) DO NOTHING;

-- 5. ORDERS
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_number text UNIQUE NOT NULL,
  plan_id text NOT NULL REFERENCES public.payment_plans(plan_id),
  expected_amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text,
  status text CHECK (status IN ('created','pending','processing','successful','failed','cancelled','expired','refunded')) DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  provider_transaction_id text,
  payment_method text,
  gross_amount_paise integer NOT NULL,
  provider_fee_paise integer DEFAULT 0,
  tax_on_fee_paise integer DEFAULT 0,
  net_settlement_paise integer DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text CHECK (status IN ('pending','processing','successful','failed','refunded')) DEFAULT 'pending',
  settlement_status text CHECK (settlement_status IN ('pending','settled','failed')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- 7. WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider text NOT NULL,
  provider_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload_hash text,
  order_id uuid REFERENCES public.payment_orders(id),
  status text CHECK (status IN ('received','verified','processed','failed','ignored')) DEFAULT 'received',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES public.payment_orders(id),
  event_type text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== C. INDEXES =====
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.user_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_expires_at ON public.user_entitlements(expires_at);
CREATE INDEX IF NOT EXISTS idx_porders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_porders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_porders_order_number ON public.payment_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_porders_provider_order_id ON public.payment_orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_ptrx_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_ptrx_provider_tx_id ON public.payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.payment_webhook_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON public.payment_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_order_id ON public.payment_audit_log(order_id);

-- ===== D. ROW LEVEL SECURITY =====
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
  DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
  DROP POLICY IF EXISTS "Anyone can view admin config" ON public.admin_config;
  DROP POLICY IF EXISTS "Anyone can view active plans" ON public.payment_plans;
  DROP POLICY IF EXISTS "Users can view own orders" ON public.payment_orders;
  DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
  DROP POLICY IF EXISTS "Users can view own audit logs" ON public.payment_audit_log;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view admin config" ON public.admin_config
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view active plans" ON public.payment_plans
  FOR SELECT USING (active = true);

CREATE POLICY "Users can view own orders" ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.payment_orders WHERE id = payment_transactions.order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can view own audit logs" ON public.payment_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ===== E. REALTIME =====
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['payments','user_entitlements','payment_orders','payment_transactions'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- ===== F. FUNCTIONS =====

-- Check if user has active pro
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

-- Expire old entitlements
CREATE OR REPLACE FUNCTION public.expire_old_entitlements()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.user_entitlements
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at <= now();
$$;

-- Expire old orders
CREATE OR REPLACE FUNCTION public.expire_old_orders()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.payment_orders
  SET status = 'expired', updated_at = now()
  WHERE status IN ('created', 'pending')
    AND expires_at <= now();
$$;

-- Generate internal order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'STUDYOS-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(
    (SELECT coalesce(max(substring(order_number from 16 for 6)::int), 0) + 1
     FROM public.payment_orders
     WHERE order_number LIKE 'STUDYOS-' || to_char(now(), 'YYYYMMDD') || '-%')::text,
    6, '0'
  );
$$;
