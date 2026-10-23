CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications mark read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_founders_new_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, account_id, kind, title, body, link)
  SELECT p.user_id, NEW.id, 'account', 'Nova conta criada',
         COALESCE(NULLIF(NEW.name, ''), NULLIF(NEW.email, ''), 'Nova conta'), '/fundador'
  FROM public.platform_admins p
  WHERE p.user_id <> NEW.owner_id;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_notify_founders AFTER INSERT ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.notify_founders_new_account();