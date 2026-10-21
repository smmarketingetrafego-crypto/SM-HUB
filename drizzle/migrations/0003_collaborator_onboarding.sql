CREATE TABLE public.onboarding_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_content_account_idx ON public.onboarding_content(account_id, kind, sort);

CREATE TABLE public.onboarding_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  collaborator_ref text NOT NULL DEFAULT '',
  user_id uuid,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX onboarding_journeys_account_email_idx ON public.onboarding_journeys(account_id, lower(email));
CREATE INDEX onboarding_journeys_user_idx ON public.onboarding_journeys(user_id);

CREATE TABLE public.onboarding_progress (
  journey_id uuid NOT NULL REFERENCES public.onboarding_journeys(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submission text NOT NULL DEFAULT '',
  feedback text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, item_id)
);

GRANT SELECT ON public.onboarding_content TO authenticated;
GRANT SELECT ON public.onboarding_journeys TO authenticated;
GRANT SELECT ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_content TO service_role;
GRANT ALL ON public.onboarding_journeys TO service_role;
GRANT ALL ON public.onboarding_progress TO service_role;

ALTER TABLE public.onboarding_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding content read" ON public.onboarding_content FOR SELECT TO authenticated USING (
  public.is_founder(auth.uid())
  OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = onboarding_content.account_id AND a.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.onboarding_journeys j WHERE j.account_id = onboarding_content.account_id AND j.user_id = auth.uid())
);
CREATE POLICY "onboarding journeys read" ON public.onboarding_journeys FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.is_founder(auth.uid())
  OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = onboarding_journeys.account_id AND a.owner_id = auth.uid())
);
CREATE POLICY "onboarding progress read" ON public.onboarding_progress FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.onboarding_journeys j WHERE j.id = onboarding_progress.journey_id AND (
    j.user_id = auth.uid() OR public.is_founder(auth.uid())
    OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = j.account_id AND a.owner_id = auth.uid())
  ))
);