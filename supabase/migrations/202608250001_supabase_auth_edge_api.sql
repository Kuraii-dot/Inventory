-- Smart Inventory cloud authentication support.
-- Keeps the existing users table and numeric user IDs for audit/history while
-- linking each account to a Supabase Auth identity used by the Tauri app.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_email TEXT UNIQUE;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.users'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'master_admin', 'integration'));

CREATE INDEX IF NOT EXISTS users_auth_user_idx ON public.users(auth_user_id);

COMMENT ON COLUMN public.users.auth_user_id IS
  'Supabase Auth identity used by the cloud-hosted Tauri client.';
COMMENT ON COLUMN public.users.auth_email IS
  'Internal Supabase Auth email generated from the Inventory username.';

