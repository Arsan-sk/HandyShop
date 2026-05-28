-- ============================================================
-- HandyShop — Auth User Trigger
-- Run this in Supabase SQL Editor SEPARATELY from the main schema.
-- This trigger auto-creates a public.users profile row whenever
-- a new auth.users row is inserted (signup, OAuth, magic link, etc.)
-- ============================================================

-- 1. Function that creates the profile row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT;
  _display_name TEXT;
  _email TEXT;
BEGIN
  -- Extract email
  _email := NEW.email;

  -- Use username from metadata if set (passed from signup page)
  _username := NEW.raw_user_meta_data->>'username';
  _display_name := NEW.raw_user_meta_data->>'display_name';

  -- Fallback: derive username from email
  IF _username IS NULL OR _username = '' THEN
    _username := split_part(_email, '@', 1);
    -- Remove invalid characters, lowercase
    _username := lower(regexp_replace(_username, '[^a-z0-9_]', '_', 'g'));
    -- Ensure minimum length
    IF length(_username) < 3 THEN
      _username := _username || '_' || substring(NEW.id::text, 1, 4);
    END IF;
  END IF;

  -- Fallback display name
  IF _display_name IS NULL OR _display_name = '' THEN
    _display_name := _username;
  END IF;

  -- Ensure username is unique by appending part of UUID if needed
  IF EXISTS (SELECT 1 FROM public.users WHERE username = _username) THEN
    _username := _username || '_' || substring(NEW.id::text, 1, 6);
  END IF;

  -- Insert profile (ignore if already exists — idempotent)
  INSERT INTO public.users (id, username, display_name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    _username,
    _display_name,
    _email,
    'buyer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Drop existing trigger if present, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- 3. Backfill existing auth.users who have no public.users row
--    Run this once after creating the trigger.
-- ============================================================
INSERT INTO public.users (id, username, display_name, email, role, created_at, updated_at)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    lower(regexp_replace(split_part(au.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
  ) || CASE
    WHEN EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.username = COALESCE(
        au.raw_user_meta_data->>'username',
        lower(regexp_replace(split_part(au.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
      )
    ) THEN '_' || substring(au.id::text, 1, 6)
    ELSE ''
  END,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  au.email,
  'buyer',
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
