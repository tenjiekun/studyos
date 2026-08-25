-- ===== STUDYOS PAY — CUSTOM PAYMENT ORCHESTRATION =====
-- Run this in Supabase SQL Editor after the existing pro-membership.sql

-- ===== 1. PLANS (server-side config) =====
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

-- Insert default plan
INSERT INTO public.payment_plans (plan_id, name, description, price_paise, currency, duration_days, active)
VALUES ('community_pro', 'Community Pro', '30 days of premium community features', 4900, 'INR', 30, true)
ON CONFLICT (plan_id) DO NOTHING;

-- ===== 2. ORDERS =====
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

-- ===== 3. TRANSACTIONS =====
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

-- ===== 4. WEBHOOK EVENTS =====
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

-- ===== 5. AUDIT LOG =====
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES public.payment_orders(id),
  event_type text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== 6. USER ENTITLEMENTS (keep existing) =====
-- Already created by pro-membership.sql

-- ===== 7. INDEXES =====
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

-- ===== 8. RLS =====
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.payment_plans FOR SELECT USING (active = true);
CREATE POLICY "Users can view own orders" ON public.payment_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.payment_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.payment_orders WHERE id = payment_transactions.order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view own audit logs" ON public.payment_audit_log FOR SELECT USING (auth.uid() = user_id);

-- ===== 9. REALTIME =====
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['payment_orders','payment_transactions','user_entitlements'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- ===== 10. FUNCTION: Generate internal order number =====
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

-- ===== 11. FUNCTION: Expire old orders =====
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

-- ===== 12. FUNCTION: Expire old entitlements =====
CREATE OR REPLACE FUNCTION public.expire_old_entitlements()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.user_entitlements
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at <= now();
$$;
