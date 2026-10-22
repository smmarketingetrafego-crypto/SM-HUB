ALTER TABLE public.onboarding_content ADD COLUMN IF NOT EXISTS item_key text NOT NULL DEFAULT '';
UPDATE public.onboarding_content SET item_key = coalesce(data->>'id', '') WHERE item_key = '';
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_content_account_kind_item_key ON public.onboarding_content (account_id, kind, item_key);