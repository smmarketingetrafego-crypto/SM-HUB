
-- Platform founders
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Fundador Master Vitalício',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own founder row" ON public.platform_admins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

-- Plans
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cycle text NOT NULL DEFAULT 'MONTHLY',
  description text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT TO anon, authenticated USING (active OR public.is_founder(auth.uid()));

-- Accounts (one per signup; id = owner user id)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  plan_id text REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_status text NOT NULL DEFAULT 'none',
  plan_valid_until timestamptz,
  lifetime boolean NOT NULL DEFAULT false,
  asaas_customer_id text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account read" ON public.accounts FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_founder(auth.uid()));

CREATE TABLE public.account_members (
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);
GRANT SELECT ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own membership read" ON public.account_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_founder(auth.uid()));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'subscription',
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'PIX',
  status text NOT NULL DEFAULT 'PENDING',
  asaas_payment_id text UNIQUE,
  invoice_url text,
  pix_payload text,
  pix_image text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated USING (account_id = auth.uid() OR public.is_founder(auth.uid()));

-- Support
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  user_id uuid NOT NULL,
  user_email text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  requester_type text NOT NULL DEFAULT 'cliente',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  needs_human boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_founder(auth.uid()));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ticket messages read" ON public.support_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_founder(auth.uid())))
);

-- Drive folders per account
CREATE TABLE public.account_drive_folders (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  folder_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_drive_folders TO service_role;
ALTER TABLE public.account_drive_folders ENABLE ROW LEVEL SECURITY;

-- Signup: profile + account + founder
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.accounts (id, owner_id, name, email)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;

  IF lower(NEW.email) = 'smmarketingetrafego@gmail.com' THEN
    INSERT INTO public.platform_admins (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    UPDATE public.accounts SET lifetime = true, plan_status = 'active' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

-- Backfill existing users
INSERT INTO public.accounts (id, owner_id, name, email)
SELECT u.id, u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), COALESCE(u.email,'')
FROM auth.users u ON CONFLICT (id) DO NOTHING;
INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'smmarketingetrafego@gmail.com' ON CONFLICT DO NOTHING;
UPDATE public.accounts SET lifetime = true, plan_status = 'active'
WHERE id IN (SELECT user_id FROM public.platform_admins);

-- Remove the shared test-data row
DELETE FROM public.workspace_data WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Starter plans (editable in admin panel)
INSERT INTO public.plans (id, name, price, cycle, description, features, sort) VALUES
 ('starter', 'Starter', 97.00, 'MONTHLY', 'Para freelancers', '["CRM e propostas","1 usuário","Suporte"]', 1),
 ('pro', 'Pro', 197.00, 'MONTHLY', 'Para agências em crescimento', '["Tudo do Starter","Até 5 usuários","Agentes de IA"]', 2),
 ('agency', 'Agência', 397.00, 'MONTHLY', 'Para agências completas', '["Tudo do Pro","Usuários ilimitados","Suporte prioritário"]', 3);
