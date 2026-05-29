"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Grid3X3,
  ShoppingBag,
  MapPin,
  MessageCircle,
  UserPlus,
  UserCheck,
  Package,
  Map,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import type { PostWithDetails, Product, ProductImage } from "@/types";
import FollowListModal from "@/components/profile/follow-list-modal";
import styles from "./profile-view.module.css";

interface ProfileViewProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: ProfileViewProps) {
  const router = useRouter();
  const { username } = use(params);
  const { user: currentUser, profile: currentProfile, refreshProfile } = useAuth();

  const [profileData, setProfileData] = useState<any | null>(null);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [products, setProducts] = useState<(Product & { images: ProductImage[] })[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "products">("posts");
  const [isFollowingSubmitting, setIsFollowingSubmitting] = useState(false);

  // Private profile state (stored in localStorage for other users)
  const [isTargetPrivate, setIsTargetPrivate] = useState(false);
  const [activeFollowList, setActiveFollowList] = useState<{ type: "followers" | "following"; isOpen: boolean } | null>(null);

  useEffect(() => {
    // If the username matches the currently logged in user's username, redirect to /profile
    if (currentProfile && username.toLowerCase() === currentProfile.username.toLowerCase()) {
      router.replace("/profile");
      return;
    }

    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${username}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("User not found");
          }
          throw new Error("Failed to load user profile");
        }
        const data = await response.json();
        
        setProfileData(data.profile);
        setIsFollowing(data.is_following);
        setPosts(data.posts || []);
        setProducts(data.products || []);

        // Retrieve target user's is_private status from localStorage if set
        const privateVal = localStorage.getItem(`is_private_${data.profile.id}`);
        setIsTargetPrivate(privateVal === "true");

        // Track profile view analytics event
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "profile_view",
            target_user_id: data.profile.id,
          }),
        }).catch((err) => console.warn("Analytics track failed:", err));

      } catch (err) {
        console.error("[Profile View] Error fetching:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username, currentProfile]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (isFollowingSubmitting || !profileData) return;

    setIsFollowingSubmitting(true);
    try {
      const response = await fetch(`/api/users/${username}/follow`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to follow/unfollow user");
      }
      const data = await response.json();

      setIsFollowing(data.is_following);
      
      // Update local follower count from response
      setProfileData((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          follower_count: data.follower_count !== undefined ? data.follower_count : (data.is_following
            ? (prev.follower_count || 0) + 1
            : Math.max(0, (prev.follower_count || 0) - 1)),
        };
      });

      // Fetch the logged-in user's updated profile to sync following_count in real-time
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      alert("Follow action failed. Try again.");
    } finally {
      setIsFollowingSubmitting(false);
    }
  };

  const handleMessageRedirect = () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (!profileData) return;
    // Redirect to chats page with target user query param to initialize chat
    router.push(`/chats?userId=${profileData.id}`);
  };

  const handleMapRedirect = () => {
    if (!profileData || !profileData.seller_profile) return;
    const shop = profileData.seller_profile;
    
    // Log map open event in analytics
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "map_open",
        target_user_id: profileData.id,
      }),
    }).catch((err) => console.warn("Analytics track failed:", err));

    // Construct maps URL using coordinates or shop name/location details
    let mapsUrl = "";
    if (shop.shop_latitude && shop.shop_longitude) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${shop.shop_latitude},${shop.shop_longitude}`;
    } else {
      const query = encodeURIComponent(`${shop.shop_name}, ${shop.shop_area || ""}, ${shop.shop_city || ""}`);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(mapsUrl, "_blank");
  };

  const handleProductClick = (productId: string) => {
    if (!profileData) return;
    // Log product click event in analytics
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "product_click",
        target_user_id: profileData.id,
        target_product_id: productId,
      }),
    }).catch((err) => console.warn("Analytics track failed:", err));

    // Navigate to product view details page
    router.push(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading Profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2>Profile Unavailable</h2>
          <p>{error || "We couldn't retrieve this user's profile."}</p>
          <button onClick={() => router.push("/home")} className={styles.homeBtn}>
            <ArrowLeft size={16} />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Get initials for profile placeholder
  const initials = (profileData.display_name || profileData.username || "U")
    .substring(0, 2)
    .toUpperCase();

  const isSeller = profileData.role === "seller";
  const shop = profileData.seller_profile;

  // Sorting posts using client-side pinned posts
  const getSortedPosts = () => {
    const pinnedKey = `pinned_posts_${profileData.id}`;
    const pinnedListRaw = localStorage.getItem(pinnedKey);
    let pinnedList: string[] = [];
    if (pinnedListRaw) {
      try {
        pinnedList = JSON.parse(pinnedListRaw) as string[];
      } catch {}
    }
    return [...posts].sort((a, b) => {
      const aPinned = pinnedList.includes(a.id);
      const bPinned = pinnedList.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const sortedPosts = getSortedPosts();

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <span className={styles.usernameTitle}>{profileData.username}</span>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </div>

      {/* Main Profile Info Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.profileSection}
      >
        {/* Avatar + Stats */}
        <div className={styles.profileTop}>
          <div className={styles.avatarWrapper}>
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt={profileData.username} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{profileData.post_count || 0}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div
              className={styles.statBtn}
              onClick={() => setActiveFollowList({ type: "followers", isOpen: true })}
            >
              <span className={styles.statValue}>{profileData.follower_count || 0}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div
              className={styles.statBtn}
              onClick={() => setActiveFollowList({ type: "following", isOpen: true })}
            >
              <span className={styles.statValue}>{profileData.following_count || 0}</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>
        </div>

        {/* Bio & Location */}
        <div className={styles.bio}>
          <p className={styles.displayName}>
            {profileData.display_name || profileData.username}
            {isSeller && shop?.is_verified && <span className={styles.verifiedBadge} title="Verified Seller">✓</span>}
          </p>
          
          {/* Seller shop description override */}
          {isSeller && shop?.shop_name && (
            <p className={styles.shopName}>🏪 {shop.shop_name}</p>
          )}

          <p className={styles.bioText}>
            {isSeller ? (shop?.shop_description || profileData.bio || "No shop description provided.") : (profileData.bio || "No bio set yet.")}
          </p>

          {(profileData.city || profileData.area) && (
            <p className={styles.location}>
              <MapPin size={12} /> {profileData.city}{profileData.area ? `, ${profileData.area}` : ""}
            </p>
          )}

          {isSeller && shop?.category?.name && (
            <span className={styles.categoryTag}>
              {shop.category.name}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className={styles.actions}>
          <button
            onClick={handleFollowToggle}
            className={`${styles.followBtn} ${isFollowing ? styles.followingActive : ""}`}
            disabled={isFollowingSubmitting}
          >
            {isFollowing ? (
              <>
                <UserCheck size={14} />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Follow</span>
              </>
            )}
          </button>
          
          <button onClick={handleMessageRedirect} className={styles.messageBtn}>
            <MessageCircle size={14} />
            <span>Message</span>
          </button>

          {isSeller && (
            <button onClick={handleMapRedirect} className={styles.mapBtn} title="View Shop Location">
              <Map size={14} />
              <span>Location</span>
            </button>
          )}
        </div>
      </motion.section>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab("posts")}
          className={`${styles.tab} ${activeTab === "posts" ? styles.tabActive : ""}`}
          aria-label="Posts tab"
        >
          <Grid3X3 size={20} />
        </button>
        {isSeller && (
          <button
            onClick={() => setActiveTab("products")}
            className={`${styles.tab} ${activeTab === "products" ? styles.tabActive : ""}`}
            aria-label="Products tab"
          >
            <ShoppingBag size={20} />
          </button>
        )}
      </div>

      {/* Profile content display */}
      <section className={styles.tabContent}>
        {isTargetPrivate && !isFollowing ? (
          /* Private Profile State */
          <div className={styles.privateProfile}>
            <Lock size={32} className={styles.privateIcon} />
            <h3>This Account is Private</h3>
            <p>Follow this user to view their posts and products.</p>
          </div>
        ) : (
          <>
            {/* Posts Grid */}
            {activeTab === "posts" && (
              sortedPosts.length === 0 ? (
                <div className={styles.emptyGrid}>
                  <p>No posts yet</p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {sortedPosts.map((post) => {
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
                            <img src={firstMedia} alt="Post media preview" className={styles.gridMedia} />
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

            {/* Products Grid */}
            {activeTab === "products" && isSeller && (
              products.length === 0 ? (
                <div className={styles.emptyGrid}>
                  <p>No products listed yet</p>
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {products.map((prod) => {
                    const hasImage = prod.images && prod.images.length > 0;
                    const thumb = hasImage ? prod.images[0].image_url : "";
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleProductClick(prod.id)}
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
          </>
        )}
      </section>

      {/* Followers & Following Lists Modal */}
      {activeFollowList && (
        <FollowListModal
          isOpen={activeFollowList.isOpen}
          onClose={() => setActiveFollowList(null)}
          username={username}
          type={activeFollowList.type}
          onCountChange={async () => {
            // Refetch target user profile details to update follower count on the view page
            try {
              const response = await fetch(`/api/users/${username}`);
              if (response.ok) {
                const data = await response.json();
                setProfileData(data.profile);
              }
            } catch (err) {
              console.error("Refetching target user failed:", err);
            }
          }}
        />
      )}
    </div>
  );
}
