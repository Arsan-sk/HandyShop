"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Grid, ShoppingBag, User, History, Trash2 } from "lucide-react";
import PostCard from "@/components/post/post-card";
import ProductCard from "@/components/product/product-card";
import UserCard from "@/components/profile/user-card";
import type { PostWithDetails, Product, ProductImage, User as UserType } from "@/types";
import styles from "./trends.module.css";

const filterChips = [
  { id: "trending", label: "🔥 Trending" },
  { id: "nearby", label: "📍 Nearby" },
  { id: "following", label: "👥 Following" },
  { id: "foryou", label: "✨ For You" },
];

export default function TrendsPage() {
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"posts" | "products" | "users">("posts");

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
        } else if (type === "users") {
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

  // Handle query input with debounce
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchResults(val, selectedFilter, selectedCategory, activeTab);
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

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchWrapper} id="search-section">
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search shops, products, tags..."
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
          <button className={styles.filterBtn} id="filter-button" aria-label="Filters">
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

      {/* Categories Slider */}
      <div className={styles.categoryWrapper}>
        <div className={styles.categorySlider}>
          <button
            className={`${styles.categoryPill} ${selectedCategory === "" ? styles.categoryPillActive : ""}`}
            onClick={() => setSelectedCategory("")}
            id="category-pill-all"
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryPill} ${selectedCategory === cat.id ? styles.categoryPillActive : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
              id={`category-pill-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Chips */}
      <div className={styles.chips}>
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            className={`${styles.chip} ${selectedFilter === chip.id ? styles.chipActive : ""}`}
            onClick={() => setSelectedFilter(chip.id)}
            id={`filter-${chip.id}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Result Tabs */}
      <div className={styles.tabs} id="search-tabs">
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
          className={`${styles.tabButton} ${activeTab === "users" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("users")}
          id="tab-users"
        >
          <User size={16} />
          <span>Shops</span>
        </button>
      </div>

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
              className={styles.postsList}
            >
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onAppreciate={handleAppreciate}
                  onPick={handlePick}
                />
              ))}
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
          ) : activeTab === "users" && users.length > 0 ? (
            <motion.div
              key="users"
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
    </div>
  );
}
