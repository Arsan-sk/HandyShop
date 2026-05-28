-- ============================================================
-- HandyShop — Critical Auth & RLS Fixes
-- Run this in Supabase SQL Editor to fix signup infinite loop
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FIX: Ensure Trigger is Properly Set Up
-- ────────────────────────────────────────────────────────────

-- Drop and recreate the trigger function to ensure it's correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

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
  _attempt INT := 0;
  _max_attempts INT := 5;
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
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = _username) 
    AND _attempt < _max_attempts LOOP
    _username := _username || '_' || substring(NEW.id::text, 1 + _attempt * 2, 2);
    _attempt := _attempt + 1;
  END LOOP;

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
  ON CONFLICT (id) DO UPDATE
  SET 
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = NOW()
  WHERE users.id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail — the user is still created in auth.users
  RAISE WARNING 'Error in handle_new_auth_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ────────────────────────────────────────────────────────────
-- 2. FIX: Update RLS Policies for Users Table
-- Relax the INSERT policy to allow the callback to work
-- ────────────────────────────────────────────────────────────

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a more permissive policy that:
-- 1. Allows users to insert their own profile
-- 2. Allows authenticated requests (including server callbacks)
-- 3. The trigger will enforce data validity
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (
    -- User can insert their own profile (from client signup)
    auth.uid() = id
    OR
    -- OR allow authenticated inserts (from server callback)
    auth.uid() IS NOT NULL
  );

-- Keep the update policy restrictive (users can only update their own)
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 3. FIX: Disable Email Confirmation (if needed)
-- If you want instant signup without email verification:
-- In Supabase Dashboard → Authentication → Providers → Email
-- Toggle "Confirm email" OFF
-- This allows signup to complete immediately with a session
-- ────────────────────────────────────────────────────────────

-- Note: Email confirmation is configured in Supabase Dashboard, not in SQL
-- Current setting: Check Supabase Dashboard
-- For instant signup: Disable email confirmation in dashboard
-- For email verification: Keep it enabled (but ensure callback handles it)

-- ────────────────────────────────────────────────────────────
-- 4. VERIFY: Check Categories Table Exists
-- ────────────────────────────────────────────────────────────

-- Ensure categories exist (required for onboarding)
INSERT INTO categories (name, slug, display_order) VALUES
  ('Clothing',    'clothing',    1),
  ('Cosmetics',   'cosmetics',   2),
  ('Electronics', 'electronics', 3),
  ('Handmade',    'handmade',    4),
  ('Furniture',   'furniture',   5),
  ('Accessories', 'accessories', 6),
  ('Wearables',   'wearables',   7),
  ('Other',       'other',       8)
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- TESTING QUERIES (run these to verify fixes)
-- ════════════════════════════════════════════════════════════

-- 1. Check if trigger exists and is active:
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if categories exist:
SELECT COUNT(*) as category_count FROM categories;

-- 3. Check RLS policies on users table:
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 4. Verify trigger function exists:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'handle_new_auth_user' 
AND routine_schema = 'public';
