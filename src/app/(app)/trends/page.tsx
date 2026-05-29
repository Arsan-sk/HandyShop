"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Grid, ShoppingBag, User, History, Trash2, Heart, MessageCircle } from "lucide-react";
import PostCard from "@/components/post/post-card";
import ProductCard from "@/components/product/product-card";
import UserCard from "@/components/profile/user-card";
import PostOverlayModal from "@/components/post/post-overlay-modal";
import { useAuth } from "@/components/providers/auth-provider";
import type { PostWithDetails, Product, ProductImage, User as UserType } from "@/types";
import styles from "./trends.module.css";

const filterChips = [
  { id: "trending", label: "🔥 Trending" },
  { id: "nearby", label: "📍 Nearby" },
  { id: "following", label: "👥 Following" },
  { id: "foryou", label: "✨ For You" },
];

export default function TrendsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Post Overlay Modal state
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"usernames" | "posts" | "products" | "shops">("posts");
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);

  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [products, setProducts] = useState<(Product & { images: ProductImage[]; seller?: UserType })[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Search History State
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load search history from local storage
  useEffect(() => {
    const history = localStorage.getItem("search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (err) {
        console.error("Failed to parse search history:", err);
      }
    }
  }, []);

  const saveSearchTerm = (term: string) => {
    if (!term || term.trim() === "") return;
    const cleanTerm = term.trim();
    setSearchHistory((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 8);
      localStorage.setItem("search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const removeHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((t) => t !== term);
      localStorage.setItem("search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("search_history");
  };

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  // Fetch search results
  const fetchResults = useCallback(async (query = searchQuery, filter = selectedFilter, category = selectedCategory, type = activeTab) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        q: query,
        filter,
        category,
        type,
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "posts") {
          setPosts(data.posts || []);
        } else if (type === "products") {
          setProducts(data.products || []);
        } else if (type === "usernames" || type === "shops" || type === "users") {
          setUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedFilter, selectedCategory, activeTab]);

  // Initial fetches - execute asynchronously to comply with react-hooks/set-state-in-effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  // Trigger search on parameter updates - execute asynchronously to comply with react-hooks/set-state-in-effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedFilter, selectedCategory, activeTab, fetchResults]);

  // Listen to Trends navigation tab clicks when already active to reset page state to default
  useEffect(() => {
    const handleNavReset = () => {
      setSearchQuery("");
      setSelectedCategory("");
      setSelectedFilter("trending");
      setActiveTab("posts");
      // Execute a clean fetch for default empty-query state
      fetchResults("", "trending", "", "posts");
    };

    window.addEventListener("nav-click-trends", handleNavReset);
    return () => {
      window.removeEventListener("nav-click-trends", handleNavReset);
    };
  }, [fetchResults]);

  // Handle query input with debounce
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    // Immediately toggle the tab/searching UI states
    if (val.trim() !== "") {
      if (searchQuery.trim() === "") {
        setActiveTab("usernames");
      }
    } else {
      setActiveTab("posts");
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const nextType = val.trim() !== "" ? (searchQuery.trim() === "" ? "usernames" : activeTab) : "posts";
      fetchResults(val, selectedFilter, selectedCategory, nextType);
    }, 450);
  };

  // Engagement handlers
  const handleAppreciate = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/appreciate`, {
        method: "POST",
      });

      if (response.ok) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  is_appreciated: !post.is_appreciated,
                  appreciate_count: post.is_appreciated
                    ? post.appreciate_count - 1
                    : post.appreciate_count + 1,
                }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Error appreciating post:", err);
    }
  }, []);

  const handlePick = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/pick`, {
        method: "POST",
      });

      if (response.ok) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  is_picked: !post.is_picked,
                  pick_count: post.is_picked
                    ? post.pick_count - 1
                    : post.pick_count + 1,
                }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Error picking post:", err);
    }
  }, []);

  const isSearching = searchQuery.trim() !== "";

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchWrapper} id="search-section">
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search usernames, posts, products, shops..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={handleQueryChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveSearchTerm(searchQuery);
                fetchResults(searchQuery, selectedFilter, selectedCategory, activeTab);
                setIsSearchFocused(false);
              }
            }}
            id="search-input"
          />
          <button
            className={styles.filterBtn}
            id="filter-button"
            aria-label="Filters"
            onClick={() => setShowFilterOverlay(true)}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Search History Panel */}
        {isSearchFocused && searchQuery === "" && searchHistory.length > 0 && (
          <div className={styles.historyPanel}>
            <div className={styles.historyHeader}>
              <span>Recent Searches</span>
              <button onClick={clearAllHistory} className={styles.clearAllBtn}>
                Clear All
              </button>
            </div>
            <div className={styles.historyList}>
              {searchHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={styles.historyItem}
                  onClick={() => {
                    setSearchQuery(item);
                    saveSearchTerm(item);
                    fetchResults(item, selectedFilter, selectedCategory, activeTab);
                    setIsSearchFocused(false);
                  }}
                >
                  <div className={styles.historyText}>
                    <History size={14} className={styles.historyIcon} />
                    <span>{item}</span>
                  </div>
                  <button
                    onClick={(e) => removeHistoryItem(item, e)}
                    className={styles.removeHistoryBtn}
                    aria-label="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result Tabs - Only shown when user is actively searching */}
      {isSearching && (
        <div className={styles.tabs} id="search-tabs">
          <button
            className={`${styles.tabButton} ${activeTab === "usernames" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("usernames")}
            id="tab-usernames"
          >
            <User size={16} />
            <span>Usernames</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "posts" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("posts")}
            id="tab-posts"
          >
            <Grid size={16} />
            <span>Posts</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "products" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("products")}
            id="tab-products"
          >
            <ShoppingBag size={16} />
            <span>Products</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "shops" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("shops")}
            id="tab-shops"
          >
            <span style={{ fontSize: "0.85rem", marginRight: "2px" }}>🏪</span>
            <span>Shops</span>
          </button>
        </div>
      )}

      {/* Content Grid */}
      <section className={styles.gridSection} id="trends-grid">
        <AnimatePresence mode="wait">
          {isLoading ? (
            // Loading skeleton grids
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.grid}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`${styles.skeletonCard} ${styles.skeleton}`} />
              ))}
            </motion.div>
          ) : activeTab === "posts" && posts.length > 0 ? (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={styles.masonryGrid}
            >
              {posts.map((post) => {
                const firstMedia = post.media?.[0];
                const hasMedia = !!firstMedia;
                return (
                  <div
                    key={post.id}
                    className={styles.masonryItem}
                    onClick={() => {
                      setSelectedPost(post);
                      setIsOverlayOpen(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {hasMedia ? (
                      <>
                        {firstMedia.media_type === "video" ? (
                          <video src={firstMedia.media_url} className={styles.masonryMedia} muted loop playsInline />
                        ) : (
                          <img src={firstMedia.media_url} alt="Post media preview" className={styles.masonryMedia} />
                        )}
                        <div className={styles.masonryHoverOverlay}>
                          <span className={styles.overlayStat}>
                            <Heart size={16} fill="white" /> {post.appreciate_count || 0}
                          </span>
                          <span className={styles.overlayStat}>
                            <MessageCircle size={16} fill="white" /> {post.comment_count || 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={styles.textPostCard}>
                        <p className={styles.textPostCaption}>{post.caption}</p>
                        <span className={styles.textPostAuthor}>
                          @{post.user?.username || "user"}
                        </span>
                        <div className={styles.masonryHoverOverlay}>
                          <span className={styles.overlayStat}>
                            <Heart size={16} fill="white" /> {post.appreciate_count || 0}
                          </span>
                          <span className={styles.overlayStat}>
                            <MessageCircle size={16} fill="white" /> {post.comment_count || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : activeTab === "products" && products.length > 0 ? (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={styles.grid}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : activeTab === "usernames" && users.length > 0 ? (
            <motion.div
              key="usernames"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={styles.usersList}
            >
              {users.map((user) => (
                <div key={user.id} className={styles.usernameRowCard}>
                  <div
                    onClick={() => router.push(`/profile/${user.username}`)}
                    className={styles.usernameRowLink}
                  >
                    <div className={styles.usernameAvatarWrapper}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className={styles.usernameAvatar} />
                      ) : (
                        <div className={styles.usernameAvatarFallback}>
                          {user.username[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <div className={styles.usernameInfo}>
                      <span className={styles.usernameDisplayName}>
                        {user.display_name || user.username}
                      </span>
                      <span className={styles.usernameText}>@{user.username}</span>
                    </div>
                    <div className={styles.viewProfileBadge}>
                      View Profile
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : activeTab === "shops" && users.length > 0 ? (
            <motion.div
              key="shops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={styles.usersList}
            >
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </motion.div>
          ) : (
            // Empty State
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.emptyState}
            >
              <p className={styles.emptyIcon}>🔍</p>
              <h3 className="text-heading">No Results Found</h3>
              <p className="text-caption">
                We couldn&apos;t find any {activeTab} matching your search parameters. Try adjusting your query or filters.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Filters & Algorithm Overlay Modal */}
      <AnimatePresence>
        {showFilterOverlay && (
          <motion.div
            className={styles.overlayBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFilterOverlay(false)}
          >
            <motion.div
              className={styles.overlayContent}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.overlayHeader}>
                <h3>Filters & Algorithm</h3>
                <button onClick={() => setShowFilterOverlay(false)} className={styles.closeOverlayBtn}>
                  ✕
                </button>
              </div>

              <div className={styles.overlayBody}>
                {/* Algorithm Section */}
                <div className={styles.overlaySection}>
                  <h4 className={styles.sectionTitle}>Algorithm</h4>
                  <div className={styles.algorithmGrid}>
                    {filterChips.map((chip) => (
                      <button
                        key={chip.id}
                        className={`${styles.overlayBtn} ${selectedFilter === chip.id ? styles.overlayBtnActive : ""}`}
                        onClick={() => {
                          setSelectedFilter(chip.id);
                          // Fetch updated results immediately after category/filter changes
                          setTimeout(() => {
                            fetchResults(searchQuery, chip.id, selectedCategory, activeTab);
                          }, 0);
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories Section */}
                <div className={styles.overlaySection}>
                  <h4 className={styles.sectionTitle}>Category</h4>
                  <div className={styles.categoryGrid}>
                    <button
                      className={`${styles.overlayBtn} ${selectedCategory === "" ? styles.overlayBtnActive : ""}`}
                      onClick={() => {
                        setSelectedCategory("");
                        setTimeout(() => {
                          fetchResults(searchQuery, selectedFilter, "", activeTab);
                        }, 0);
                      }}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        className={`${styles.overlayBtn} ${selectedCategory === cat.id ? styles.overlayBtnActive : ""}`}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setTimeout(() => {
                            fetchResults(searchQuery, selectedFilter, cat.id, activeTab);
                          }, 0);
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.overlayFooter}>
                <button
                  className={styles.resetBtn}
                  onClick={() => {
                    setSelectedFilter("trending");
                    setSelectedCategory("");
                    setShowFilterOverlay(false);
                    setTimeout(() => {
                      fetchResults(searchQuery, "trending", "", activeTab);
                    }, 0);
                  }}
                >
                  Reset
                </button>
                <button
                  className={styles.applyBtn}
                  onClick={() => setShowFilterOverlay(false)}
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Overlay Detail Modal */}
      {selectedPost && (
        <PostOverlayModal
          post={selectedPost}
          isOpen={isOverlayOpen}
          onClose={() => {
            setIsOverlayOpen(false);
            setSelectedPost(null);
          }}
          currentUserId={user?.id}
          onPrev={
            posts.findIndex((p) => p.id === selectedPost.id) > 0
              ? () => {
                  const idx = posts.findIndex((p) => p.id === selectedPost.id);
                  setSelectedPost(posts[idx - 1]);
                }
              : undefined
          }
          onNext={
            posts.findIndex((p) => p.id === selectedPost.id) < posts.length - 1
              ? () => {
                  const idx = posts.findIndex((p) => p.id === selectedPost.id);
                  setSelectedPost(posts[idx + 1]);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
