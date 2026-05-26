// ============================================================
// HandyShop — Core TypeScript Types
// Derived from: handyshop_final_enhanced_prd.md §36–37
// ============================================================

// ── Enums ──

export type UserRole = "buyer" | "seller" | "admin";
export type PostStatus = "active" | "archived" | "deleted";
export type ProductStatus = "active" | "out_of_stock" | "archived" | "deleted";
export type MediaType = "image" | "video";
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportReason =
  | "spam"
  | "fake_products"
  | "inappropriate_media"
  | "shop_not_exist"
  | "harassment"
  | "scam"
  | "other";
export type ModerationAction =
  | "post_removed"
  | "user_suspended"
  | "user_blocked"
  | "report_resolved"
  | "report_dismissed"
  | "content_flagged";
export type AnalyticsEventType =
  | "profile_view"
  | "post_view"
  | "appreciate"
  | "pick"
  | "comment"
  | "share"
  | "follow"
  | "map_open"
  | "product_click";

// ── Database Row Types ──

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  interests: string[];
  is_suspended: boolean;
  post_count: number;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface SellerProfile {
  id: string;
  user_id: string;
  shop_name: string;
  shop_description: string | null;
  category_id: string | null;
  shop_city: string | null;
  shop_area: string | null;
  shop_latitude: number | null;
  shop_longitude: number | null;
  is_verified: boolean;
  setup_completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  variants: ProductVariant[];
  sizes: string[];
  delivery_info: string | null;
  status: ProductStatus;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  status: PostStatus;
  is_quicklook: boolean;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  appreciate_count: number;
  pick_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: MediaType;
  aspect_ratio: string;
  display_order: number;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface PostProduct {
  id: string;
  post_id: string;
  product_id: string;
  display_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

export interface Display {
  id: string;
  user_id: string;
  source_post_id: string | null;
  expires_at: string;
  view_count: number;
  created_at: string;
}

export interface DisplayMedia {
  id: string;
  display_id: string;
  media_url: string;
  media_type: MediaType;
  duration_seconds: number;
  display_order: number;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Appreciate {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Pick {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_post_id: string | null;
  target_product_id: string | null;
  event_type: AnalyticsEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Enriched / Join Types (for frontend use) ──

export interface PostWithDetails extends Post {
  user: User;
  media: PostMedia[];
  products: (Product & { images: ProductImage[] })[];
  tags: Tag[];
  is_appreciated?: boolean;
  is_picked?: boolean;
}

export interface DisplayWithDetails extends Display {
  user: User;
  media: DisplayMedia[];
  is_viewed?: boolean;
}

export interface ProfileWithDetails extends User {
  seller_profile: SellerProfile | null;
  category: Category | null;
  is_following?: boolean;
}
