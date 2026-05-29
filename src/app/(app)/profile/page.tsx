"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Grid3X3,
  ShoppingBag,
  Bookmark,
  BarChart3,
  MapPin,
  Edit3,
  Lock,
  Unlock,
  Pin,
  Package,
} from "lucide-react";
import SettingsMenu from "@/components/profile/settings-menu";
import EditProfileModal from "@/components/profile/edit-profile-modal";
import PostEditorModal from "@/components/profile/post-editor-modal";
import ProductEditorModal from "@/components/profile/product-editor-modal";
import FollowListModal from "@/components/profile/follow-list-modal";
import { useAuth } from "@/components/providers/auth-provider";
import type { PostWithDetails, Product, ProductImage } from "@/types";
import styles from "./profile.module.css";

type TabType = "posts" | "products" | "picks";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [activeFollowList, setActiveFollowList] = useState<{ type: "followers" | "following"; isOpen: boolean } | null>(null);

  // Tab data states
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [products, setProducts] = useState<(Product & { images: ProductImage[] })[]>([]);
  const [picks, setPicks] = useState<PostWithDetails[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Private profile state
  const [isPrivate, setIsPrivate] = useState(false);

  // Active editors
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<(Product & { images: ProductImage[] }) | null>(null);

  // Refresh profile details (follower/following counts) on mount to get real-time stats
  useEffect(() => {
    if (user && refreshProfile) {
      refreshProfile();
    }
  }, [user]);

  // Load private setting from LocalStorage
  useEffect(() => {
    if (profile) {
      const privateKey = `is_private_${profile.id}`;
      const localVal = localStorage.getItem(privateKey);
      setIsPrivate(localVal === "true");
    }
  }, [profile]);

  const toggleVisibility = () => {
    if (!profile) return;
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    localStorage.setItem(`is_private_${profile.id}`, newVal ? "true" : "false");
  };

  // Fetch data depending on activeTab
  const fetchData = async () => {
    if (!profile) return;
    setLoadingData(true);
    try {
      if (activeTab === "posts") {
        const res = await fetch("/api/profile/posts");
        if (res.ok) {
          const json = await res.json();
          // Sort with pinned posts first (read from localStorage)
          const pinnedKey = `pinned_posts_${profile.id}`;
          const pinnedListRaw = localStorage.getItem(pinnedKey);
          let pinnedList: string[] = [];
          if (pinnedListRaw) {
            try {
              pinnedList = JSON.parse(pinnedListRaw) as string[];
            } catch {}
          }
          const sortedPosts = (json.posts || []).sort((a: PostWithDetails, b: PostWithDetails) => {
            const aPinned = pinnedList.includes(a.id);
            const bPinned = pinnedList.includes(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setPosts(sortedPosts);
        }
      } else if (activeTab === "products") {
        const res = await fetch("/api/profile/products");
        if (res.ok) {
          const json = await res.json();
          setProducts(json.products || []);
        }
      } else if (activeTab === "picks") {
        const res = await fetch("/api/profile/picks");
        if (res.ok) {
          const json = await res.json();
          setPicks(json.posts || []);
        }
      }
    } catch (err) {
      console.error("[Profile Tabs] Fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, activeTab]);

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.unauthorized}>
        <p>Please log in to view your profile.</p>
        <button onClick={() => router.push("/login")} className={styles.loginBtn}>
          Log In
        </button>
      </div>
    );
  }

  // Get initials for profile placeholder
  const initials = (profile.display_name || profile.username || "U")
    .substring(0, 2)
    .toUpperCase();

  // Helper for pin state
  const isPostPinned = (postId: string) => {
    const pinnedListRaw = localStorage.getItem(`pinned_posts_${profile.id}`);
    if (pinnedListRaw) {
      try {
        const pinnedList = JSON.parse(pinnedListRaw) as string[];
        return pinnedList.includes(postId);
      } catch {}
    }
    return false;
  };

  return (
    <div className={styles.container} id="profile-page">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleContainer}>
          <h1 className={styles.username}>{profile.username}</h1>
          <button onClick={toggleVisibility} className={styles.visibilityToggle} title="Toggle Profile Visibility">
            {isPrivate ? <Lock size={14} /> : <Unlock size={14} />}
            <span>{isPrivate ? "Private" : "Public"}</span>
          </button>
        </div>
        <button
          className={styles.settingsBtn}
          id="settings-button"
          aria-label="Settings"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️
        </button>
      </div>

      {/* Settings Menu */}
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Profile Info */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.profileSection}
      >
        {/* Avatar + Stats */}
        <div className={styles.profileTop}>
          <div className={styles.avatarWrapper}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{profile.post_count || 0}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div
              className={styles.statBtn}
              onClick={() => setActiveFollowList({ type: "followers", isOpen: true })}
            >
              <span className={styles.statValue}>{profile.follower_count || 0}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div
              className={styles.statBtn}
              onClick={() => setActiveFollowList({ type: "following", isOpen: true })}
            >
              <span className={styles.statValue}>{profile.following_count || 0}</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className={styles.bio}>
          <p className={styles.displayName}>{profile.display_name || profile.username}</p>
          <p className={styles.bioText}>{profile.bio || "No bio set yet."}</p>
          {(profile.city || profile.area) && (
            <p className={styles.location}>
              <MapPin size={12} /> {profile.city} {profile.area ? `, ${profile.area}` : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button onClick={() => setShowEditProfile(true)} className={styles.editBtn} id="edit-profile-btn">
            <Edit3 size={14} />
            Edit Profile
          </button>
          
          {profile.role === "seller" ? (
            <button
              onClick={() => router.push("/profile/dashboard")}
              className={styles.analyticsBtn}
              id="analytics-btn"
            >
              <BarChart3 size={14} />
              Seller Dashboard
            </button>
          ) : (
            <button
              onClick={() => router.push("/profile/setup-shop")}
              className={styles.setupShopBtn}
              id="setup-shop-btn"
            >
              <ShoppingBag size={14} />
              Setup Shop
            </button>
          )}
        </div>
      </motion.section>

      {/* Content Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab("posts")}
          className={`${styles.tab} ${activeTab === "posts" ? styles.tabActive : ""}`}
          id="tab-posts"
          aria-label="Posts tab"
        >
          <Grid3X3 size={20} />
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`${styles.tab} ${activeTab === "products" ? styles.tabActive : ""}`}
          id="tab-products"
          aria-label="Products tab"
        >
          <ShoppingBag size={20} />
        </button>
        <button
          onClick={() => setActiveTab("picks")}
          className={`${styles.tab} ${activeTab === "picks" ? styles.tabActive : ""}`}
          id="tab-picks"
          aria-label="Picks tab"
        >
          <Bookmark size={20} />
        </button>
      </div>

      {/* Tab Content */}
      <section className={styles.tabContent} id="profile-content">
        {loadingData ? (
          <div className={styles.loadingTab}>
            <div className={styles.spinner} />
          </div>
        ) : (
          <>
            {/* Posts Grid */}
            {activeTab === "posts" && (
              posts.length === 0 ? (
                <div className={styles.emptyGrid}>
                  <p className="text-caption">No posts yet</p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {posts.map((post) => {
                    const firstMedia = post.media?.[0]?.media_url;
                    const isPinned = isPostPinned(post.id);
                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={styles.gridItem}
                      >
                        {firstMedia ? (
                          post.media[0].media_type === "video" ? (
                            <video src={firstMedia} className={styles.gridMedia} muted playsInline />
                          ) : (
                            <img src={firstMedia} alt="Post preview" className={styles.gridMedia} />
                          )
                        ) : (
                          <div className={styles.emptyMediaPlaceholder}>Text Post</div>
                        )}
                        
                        {/* Pinned Indicator overlay */}
                        {isPinned && (
                          <div className={styles.pinIcon} title="Pinned post">
                            <Pin size={12} />
                          </div>
                        )}
                        {post.status === "archived" && (
                          <span className={styles.archiveBadge}>Archived</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Products Grid */}
            {activeTab === "products" && (
              products.length === 0 ? (
                <div className={styles.emptyGrid}>
                  <p className="text-caption">No products listed yet</p>
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {products.map((prod) => {
                    const hasImage = prod.images && prod.images.length > 0;
                    const thumb = hasImage ? prod.images[0].image_url : "";
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProduct(prod)}
                        className={styles.productCard}
                      >
                        <div className={styles.productThumb}>
                          {hasImage ? (
                            <img src={thumb} alt={prod.title} />
                          ) : (
                            <div className={styles.emptyMediaPlaceholder}>
                              <Package size={24} style={{ opacity: 0.3 }} />
                            </div>
                          )}
                        </div>
                        <div className={styles.productDetails}>
                          <h3 className={styles.productTitle}>{prod.title}</h3>
                          <span className={styles.productPrice}>₹{prod.price.toFixed(2)}</span>
                          <span className={styles.productStock}>Stock: {prod.stock}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Picks / Saved Posts Grid */}
            {activeTab === "picks" && (
              picks.length === 0 ? (
                <div className={styles.emptyGrid}>
                  <p className="text-caption">No saved posts yet</p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {picks.map((post) => {
                    const firstMedia = post.media?.[0]?.media_url;
                    return (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/post/${post.id}`)}
                        className={styles.gridItem}
                      >
                        {firstMedia ? (
                          post.media[0].media_type === "video" ? (
                            <video src={firstMedia} className={styles.gridMedia} muted playsInline />
                          ) : (
                            <img src={firstMedia} alt="Post preview" className={styles.gridMedia} />
                          )
                        ) : (
                          <div className={styles.emptyMediaPlaceholder}>Text Post</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </section>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onSave={() => {
          refreshProfile();
          fetchData();
        }}
      />

      {/* Post Editor Modal */}
      <PostEditorModal
        isOpen={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        onSave={fetchData}
      />

      {/* Product Editor Modal */}
      <ProductEditorModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSave={fetchData}
      />

      {/* Followers & Following Lists Modal */}
      {activeFollowList && (
        <FollowListModal
          isOpen={activeFollowList.isOpen}
          onClose={() => setActiveFollowList(null)}
          username={profile.username}
          type={activeFollowList.type}
          onCountChange={refreshProfile}
        />
      )}
    </div>
  );
}
