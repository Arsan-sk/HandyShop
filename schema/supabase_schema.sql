-- ============================================================
-- HANDYSHOP — SUPABASE SCHEMA
-- Paste this entire file into the Supabase SQL Editor and run.
-- Derived from: handyshop_final_enhanced_prd.md §36–38
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE post_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE product_status AS ENUM ('active', 'out_of_stock', 'archived', 'deleted');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE report_reason AS ENUM (
  'spam', 'fake_products', 'inappropriate_media',
  'shop_not_exist', 'harassment', 'scam', 'other'
);
CREATE TYPE moderation_action AS ENUM (
  'post_removed', 'user_suspended', 'user_blocked',
  'report_resolved', 'report_dismissed', 'content_flagged'
);
CREATE TYPE display_media_type AS ENUM ('image', 'video');
CREATE TYPE analytics_event_type AS ENUM (
  'profile_view', 'post_view', 'appreciate', 'pick',
  'comment', 'share', 'follow', 'map_open', 'product_click'
);

-- ────────────────────────────────────────────────────────────
-- 2. TABLES
-- ────────────────────────────────────────────────────────────

-- 2.1 Categories (PRD §15)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO categories (name, slug, display_order) VALUES
  ('Clothing',    'clothing',    1),
  ('Cosmetics',   'cosmetics',   2),
  ('Electronics', 'electronics', 3),
  ('Handmade',    'handmade',    4),
  ('Furniture',   'furniture',   5),
  ('Accessories', 'accessories', 6),
  ('Wearables',   'wearables',   7),
  ('Other',       'other',       8);

-- 2.2 Users (PRD §5, §27–28)
-- This extends Supabase auth.users with app-specific profile data.
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  role user_role DEFAULT 'buyer',
  city TEXT,
  area TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests UUID[] DEFAULT '{}',  -- array of category IDs
  is_suspended BOOLEAN DEFAULT FALSE,
  post_count INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Username validation: lowercase, no spaces, underscores & numbers OK
ALTER TABLE users ADD CONSTRAINT username_format
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- 2.3 Seller Profiles (PRD §6)
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  shop_description TEXT,
  category_id UUID REFERENCES categories(id),
  shop_city TEXT,
  shop_area TEXT,
  shop_latitude DOUBLE PRECISION,
  shop_longitude DOUBLE PRECISION,
  is_verified BOOLEAN DEFAULT FALSE,
  setup_completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Products (PRD §10)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  variants JSONB DEFAULT '[]',   -- [{name, options[]}]
  sizes JSONB DEFAULT '[]',      -- ["S","M","L","XL"]
  delivery_info TEXT,
  status product_status DEFAULT 'active',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Product Images
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Posts (PRD §9, §11)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  status post_status DEFAULT 'active',
  is_quicklook BOOLEAN DEFAULT FALSE,      -- TRUE = QuickLook content
  city TEXT,
  area TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  appreciate_count INT DEFAULT 0,
  pick_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ                  -- set when auto-archived after 60 days
);

-- 2.7 Post Media (PRD §11, §18)
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type media_type NOT NULL DEFAULT 'image',
  aspect_ratio TEXT DEFAULT '1:1',         -- 1:1, 4:5, 9:16, 16:9
  display_order INT DEFAULT 0,
  duration_seconds NUMERIC(8,2),           -- for videos
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Max 10 media items per post enforced at app level (PRD §18)

-- 2.8 Post-Products Junction (PRD §9 — many-to-many)
CREATE TABLE post_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, product_id)
);

-- 2.9 Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.10 Post Tags
CREATE TABLE post_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE (post_id, tag_id)
);

-- 2.11 Displays (PRD §8)
CREATE TABLE displays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,  -- if shared from a post
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.12 Display Media
CREATE TABLE display_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type display_media_type NOT NULL DEFAULT 'image',
  duration_seconds NUMERIC(8,2) DEFAULT 5, -- images default 5s
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.13 Follows (PRD §14)
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- 2.14 Appreciates (PRD §20)
CREATE TABLE appreciates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- 2.15 Picks / Saves (PRD §20 — private)
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- 2.16 Comments (PRD §21)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,  -- threading
  body TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comment length 300–500 chars enforced at app level (PRD §21)

-- 2.17 Reports (PRD §23)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  reason report_reason NOT NULL DEFAULT 'other',
  description TEXT,
  status report_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.18 Blocked Users (PRD §22)
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- 2.19 Muted Users (PRD §22)
CREATE TABLE muted_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  muter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

-- 2.20 Moderation Logs (PRD §22, §35)
CREATE TABLE moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  action moderation_action NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.21 Analytics Events (PRD §24)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,    -- who performed the action
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- whose content
  target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  event_type analytics_event_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.22 Display Views (track viewed state per user)
CREATE TABLE display_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, display_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ────────────────────────────────────────────────────────────

-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city_area ON users(city, area);
CREATE INDEX idx_users_location ON users(latitude, longitude) WHERE latitude IS NOT NULL;

-- Seller Profiles
CREATE INDEX idx_seller_profiles_user ON seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_category ON seller_profiles(category_id);
CREATE INDEX idx_seller_profiles_location ON seller_profiles(shop_latitude, shop_longitude) WHERE shop_latitude IS NOT NULL;

-- Posts (feed ranking)
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX idx_posts_quicklook ON posts(is_quicklook, created_at DESC) WHERE is_quicklook = TRUE;
CREATE INDEX idx_posts_location ON posts(city, area);
CREATE INDEX idx_posts_engagement ON posts(appreciate_count DESC, view_count DESC);

-- Post Media
CREATE INDEX idx_post_media_post ON post_media(post_id, display_order);

-- Products
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- Post Products
CREATE INDEX idx_post_products_post ON post_products(post_id);
CREATE INDEX idx_post_products_product ON post_products(product_id);

-- Displays
CREATE INDEX idx_displays_user ON displays(user_id, created_at DESC);
CREATE INDEX idx_displays_expires ON displays(expires_at);
CREATE INDEX idx_displays_source_post ON displays(source_post_id) WHERE source_post_id IS NOT NULL;

-- Follows
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Appreciates
CREATE INDEX idx_appreciates_post ON appreciates(post_id);
CREATE INDEX idx_appreciates_user ON appreciates(user_id);

-- Picks
CREATE INDEX idx_picks_user ON picks(user_id, created_at DESC);
CREATE INDEX idx_picks_post ON picks(post_id);

-- Comments
CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Reports
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- Blocked / Muted
CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);
CREATE INDEX idx_muted_muter ON muted_users(muter_id);

-- Analytics
CREATE INDEX idx_analytics_target_user ON analytics_events(target_user_id, event_type, created_at DESC);
CREATE INDEX idx_analytics_post ON analytics_events(target_post_id) WHERE target_post_id IS NOT NULL;
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- Tags / Search
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- Display Views
CREATE INDEX idx_display_views_user ON display_views(user_id);
CREATE INDEX idx_display_views_display ON display_views(display_id);

-- Full-text search on posts (PRD §17)
CREATE INDEX idx_posts_caption_search ON posts USING gin(to_tsvector('english', COALESCE(caption, '')));

-- Full-text search on products
CREATE INDEX idx_products_title_search ON products USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- ────────────────────────────────────────────────────────────
-- 4. FUNCTIONS & TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment/decrement follower counts
CREATE OR REPLACE FUNCTION handle_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_count_insert
  AFTER INSERT ON follows FOR EACH ROW EXECUTE FUNCTION handle_follow_count();
CREATE TRIGGER trg_follow_count_delete
  AFTER DELETE ON follows FOR EACH ROW EXECUTE FUNCTION handle_follow_count();

-- Increment/decrement post appreciate count
CREATE OR REPLACE FUNCTION handle_appreciate_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET appreciate_count = appreciate_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET appreciate_count = GREATEST(appreciate_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appreciate_count_insert
  AFTER INSERT ON appreciates FOR EACH ROW EXECUTE FUNCTION handle_appreciate_count();
CREATE TRIGGER trg_appreciate_count_delete
  AFTER DELETE ON appreciates FOR EACH ROW EXECUTE FUNCTION handle_appreciate_count();

-- Increment/decrement post pick count
CREATE OR REPLACE FUNCTION handle_pick_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET pick_count = pick_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET pick_count = GREATEST(pick_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pick_count_insert
  AFTER INSERT ON picks FOR EACH ROW EXECUTE FUNCTION handle_pick_count();
CREATE TRIGGER trg_pick_count_delete
  AFTER DELETE ON picks FOR EACH ROW EXECUTE FUNCTION handle_pick_count();

-- Increment/decrement post comment count
CREATE OR REPLACE FUNCTION handle_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_count_insert
  AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION handle_comment_count();
CREATE TRIGGER trg_comment_count_delete
  AFTER DELETE ON comments FOR EACH ROW EXECUTE FUNCTION handle_comment_count();

-- Increment user post count
CREATE OR REPLACE FUNCTION handle_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_count_insert
  AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION handle_post_count();
CREATE TRIGGER trg_post_count_delete
  AFTER DELETE ON posts FOR EACH ROW EXECUTE FUNCTION handle_post_count();

-- Increment tag usage count
CREATE OR REPLACE FUNCTION handle_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tag_usage_insert
  AFTER INSERT ON post_tags FOR EACH ROW EXECUTE FUNCTION handle_tag_usage();
CREATE TRIGGER trg_tag_usage_delete
  AFTER DELETE ON post_tags FOR EACH ROW EXECUTE FUNCTION handle_tag_usage();

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE appreciates ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ── Helper: check if current user is admin ──
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── CATEGORIES ──
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories"
  ON categories FOR ALL USING (is_admin());

-- ── USERS ──
CREATE POLICY "Public profiles are readable"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ── SELLER PROFILES ──
CREATE POLICY "Seller profiles are publicly readable"
  ON seller_profiles FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own profile"
  ON seller_profiles FOR ALL USING (auth.uid() = user_id);

-- ── PRODUCTS ──
CREATE POLICY "Active products are publicly readable"
  ON products FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);

CREATE POLICY "Sellers can manage own products"
  ON products FOR ALL USING (auth.uid() = seller_id);

-- ── PRODUCT IMAGES ──
CREATE POLICY "Product images are publicly readable"
  ON product_images FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own product images"
  ON product_images FOR ALL USING (
    auth.uid() = (SELECT seller_id FROM products WHERE id = product_images.product_id)
  );

-- ── POSTS ──
CREATE POLICY "Active posts are publicly readable"
  ON posts FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all posts"
  ON posts FOR ALL USING (is_admin());

-- ── POST MEDIA ──
CREATE POLICY "Post media is publicly readable"
  ON post_media FOR SELECT USING (true);

CREATE POLICY "Users can manage own post media"
  ON post_media FOR ALL USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_media.post_id)
  );

-- ── POST PRODUCTS ──
CREATE POLICY "Post products are publicly readable"
  ON post_products FOR SELECT USING (true);

CREATE POLICY "Post owners can manage post-product links"
  ON post_products FOR ALL USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_products.post_id)
  );

-- ── TAGS ──
CREATE POLICY "Tags are publicly readable"
  ON tags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── POST TAGS ──
CREATE POLICY "Post tags are publicly readable"
  ON post_tags FOR SELECT USING (true);

CREATE POLICY "Post owners can manage post tags"
  ON post_tags FOR ALL USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_tags.post_id)
  );

-- ── DISPLAYS ──
CREATE POLICY "Active displays are publicly readable"
  ON displays FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can manage own displays"
  ON displays FOR ALL USING (auth.uid() = user_id);

-- ── DISPLAY MEDIA ──
CREATE POLICY "Display media is publicly readable"
  ON display_media FOR SELECT USING (true);

CREATE POLICY "Users can manage own display media"
  ON display_media FOR ALL USING (
    auth.uid() = (SELECT user_id FROM displays WHERE id = display_media.display_id)
  );

-- ── DISPLAY VIEWS ──
CREATE POLICY "Users can read own display views"
  ON display_views FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert display views"
  ON display_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── FOLLOWS ──
CREATE POLICY "Follows are publicly readable"
  ON follows FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- ── APPRECIATES ──
CREATE POLICY "Appreciates are publicly readable"
  ON appreciates FOR SELECT USING (true);

CREATE POLICY "Users can manage own appreciates"
  ON appreciates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own appreciates"
  ON appreciates FOR DELETE USING (auth.uid() = user_id);

-- ── PICKS (private to owner) ──
CREATE POLICY "Users can read only own picks"
  ON picks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own picks"
  ON picks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own picks"
  ON picks FOR DELETE USING (auth.uid() = user_id);

-- ── COMMENTS ──
CREATE POLICY "Comments are publicly readable"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON comments FOR ALL USING (is_admin());

-- ── REPORTS ──
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT USING (auth.uid() = reporter_id OR is_admin());

CREATE POLICY "Admins can manage all reports"
  ON reports FOR ALL USING (is_admin());

-- ── BLOCKED USERS ──
CREATE POLICY "Users can manage own blocks"
  ON blocked_users FOR ALL USING (auth.uid() = blocker_id);

CREATE POLICY "Users can see if they are blocked (for filtering)"
  ON blocked_users FOR SELECT USING (auth.uid() = blocked_id);

-- ── MUTED USERS ──
CREATE POLICY "Users can manage own mutes"
  ON muted_users FOR ALL USING (auth.uid() = muter_id);

-- ── MODERATION LOGS ──
CREATE POLICY "Only admins can access moderation logs"
  ON moderation_logs FOR ALL USING (is_admin());

-- ── ANALYTICS EVENTS ──
CREATE POLICY "Users can view own analytics"
  ON analytics_events FOR SELECT USING (auth.uid() = target_user_id);

CREATE POLICY "Authenticated users can insert analytics events"
  ON analytics_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all analytics"
  ON analytics_events FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS (PRD §38)
-- ────────────────────────────────────────────────────────────

-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('posts-media',    'posts-media',    true),
  ('displays-media', 'displays-media', true),
  ('profile-images', 'profile-images', true),
  ('product-images', 'product-images', true);

-- ── Storage Policies: Public Read ──

CREATE POLICY "Public read for posts-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts-media');

CREATE POLICY "Public read for displays-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'displays-media');

CREATE POLICY "Public read for profile-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Public read for product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- ── Storage Policies: Authenticated Upload ──

CREATE POLICY "Authenticated users can upload to posts-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload to displays-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'displays-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload to profile-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload to product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
  );

-- ── Storage Policies: Owner Delete/Update ──
-- Users can only manage files in their own folder (convention: {user_id}/filename)

CREATE POLICY "Users can update own files in posts-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'posts-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in posts-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in displays-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'displays-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in displays-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'displays-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in profile-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in profile-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in product-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in product-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ════════════════════════════════════════════════════════════
-- DONE. Schema is ready.
-- ════════════════════════════════════════════════════════════
