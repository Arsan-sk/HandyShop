-- ============================================================
-- HandyShop — Database Trigger & RLS Fixes
-- Run this script in the Supabase SQL Editor (Dashboard)
-- to fix the followers, following, and post count updates.
-- ============================================================

-- 1. Update handle_follow_count with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_follow_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 2. Update handle_appreciate_count with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_appreciate_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET appreciate_count = appreciate_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET appreciate_count = GREATEST(appreciate_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 3. Update handle_pick_count with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_pick_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET pick_count = pick_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET pick_count = GREATEST(pick_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 4. Update handle_comment_count with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 5. Update handle_post_count with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET post_count = post_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 6. Update handle_tag_usage with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.handle_tag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
END;
$$;

-- 7. RECALCULATE & BACKFILL ALL EXISTING COUNTS
-- This instantly fixes any mismatched stats currently in the database.
UPDATE public.users u
SET
  follower_count = (
    SELECT COUNT(*) FROM public.follows WHERE following_id = u.id
  ),
  following_count = (
    SELECT COUNT(*) FROM public.follows WHERE follower_id = u.id
  ),
  post_count = (
    SELECT COUNT(*) FROM public.posts WHERE user_id = u.id AND status = 'active'
  );

UPDATE public.posts p
SET
  appreciate_count = (
    SELECT COUNT(*) FROM public.appreciates WHERE post_id = p.id
  ),
  pick_count = (
    SELECT COUNT(*) FROM public.picks WHERE post_id = p.id
  ),
  comment_count = (
    SELECT COUNT(*) FROM public.comments WHERE post_id = p.id AND is_deleted = false
  );

UPDATE public.tags t
SET
  usage_count = (
    SELECT COUNT(*) FROM public.post_tags WHERE tag_id = t.id
  );
