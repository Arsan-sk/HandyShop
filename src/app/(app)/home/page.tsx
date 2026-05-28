"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MobileHeader from "@/components/home/mobile-header";
import DisplaysBar from "@/components/display/displays-bar";
import DisplayViewer from "@/components/display/display-viewer";
import PostCard from "@/components/post/post-card";
import { PostWithDetails, DisplayWithDetails } from "@/types";
import styles from "./home.module.css";

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [displays, setDisplays] = useState<DisplayWithDetails[]>([]);
  const [viewingDisplayId, setViewingDisplayId] = useState<string | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingDisplays, setIsLoadingDisplays] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Pull-to-refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartRef.current;

    if (deltaY > 0) {
      // Calculate distance with resistance
      const dist = Math.min(80, deltaY * 0.4);
      setPullDistance(dist);
      // Prevent overshoot scrolling
      if (dist > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (touchStartRef.current === null) return;
    touchStartRef.current = null;

    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await Promise.all([fetchDisplays(), fetchPosts(0)]);
      } catch (err) {
        console.error("Refresh failed:", err);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Fetch displays from API
  const fetchDisplays = useCallback(async () => {
    try {
      setIsLoadingDisplays(true);
      const response = await fetch("/api/displays/feed");

      if (!response.ok) {
        throw new Error("Failed to fetch displays");
      }

      const data = await response.json();
      setDisplays(data.displays || []);
    } catch (err) {
      console.error("Error fetching displays:", err);
    } finally {
      setIsLoadingDisplays(false);
    }
  }, []);

  // Fetch posts from API
  const fetchPosts = useCallback(async (pageNum: number) => {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const response = await fetch(`/api/posts/feed?page=${pageNum}&limit=10`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch posts");
      }

      const data = await response.json();
      const newPosts = data.posts || [];

      // On first page with no posts, show empty state but don't error
      if (pageNum === 0 && newPosts.length === 0) {
        setPosts([]);
        setHasMorePosts(false);
        setError(null);
      } else if (newPosts.length === 0) {
        // Subsequent pages with no posts
        setHasMorePosts(false);
      } else {
        setPosts((prev) => (pageNum === 0 ? newPosts : [...prev, ...newPosts]));
        setPage(pageNum + 1);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      // Only show error if it's not the initial load with no posts
      if (posts.length > 0) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      }
      setHasMorePosts(false);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [posts.length]);

  // Initial fetch
  useEffect(() => {
    fetchDisplays();
    fetchPosts(0);
  }, [fetchDisplays, fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !isLoadingPosts) {
          fetchPosts(page);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [fetchPosts, hasMorePosts, isLoadingPosts, page]);

  // Handle appreciate action
  const handleAppreciate = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/appreciate`, {
        method: "POST",
      });

      if (response.ok) {
        // Update local state
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

  // Handle pick action
  const handlePick = useCallback(async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/pick`, {
        method: "POST",
      });

      if (response.ok) {
        // Update local state
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

  // Find initial display index
  const displayIndexForId = viewingDisplayId
    ? displays.findIndex((d) => d.id === viewingDisplayId)
    : 0;

  return (
    <>
      <MobileHeader />
      <div
        className={styles.container}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull To Refresh Indicator */}
        <div
          className={styles.pullToRefresh}
          style={{
            height: isRefreshing ? "50px" : `${pullDistance}px`,
            opacity: isRefreshing || pullDistance > 0 ? 1 : 0,
            transition:
              isRefreshing || touchStartRef.current === null
                ? "height 0.2s ease, opacity 0.2s ease"
                : "none",
          }}
        >
          {isRefreshing ? (
            <div className={styles.spinnerSmall} />
          ) : (
            <div
              className={styles.refreshArrow}
              style={{ transform: `rotate(${pullDistance * 5}deg)` }}
            >
              👇
            </div>
          )}
        </div>

        {/* Displays Bar */}
        <DisplaysBar
          displays={displays}
          onDisplayClick={setViewingDisplayId}
          onCreateDisplay={() => router.push("/displays/create")}
        />

        {/* Display Viewer Modal */}
        {viewingDisplayId && (
          <DisplayViewer
            displays={displays}
            initialUserIndex={displayIndexForId >= 0 ? displayIndexForId : 0}
            onClose={() => setViewingDisplayId(null)}
          />
        )}

        {/* Feed Section */}
        <section className={styles.feed} id="home-feed">
          {posts.length === 0 && !isLoadingPosts && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={styles.emptyState}
            >
              <div className={styles.emptyIcon}>🛍️</div>
              <h2 className="text-heading">Discover Local Shops</h2>
              <p className="text-caption">
                Follow sellers and explore nearby shops to fill your feed with
                amazing products.
              </p>
              <p className={styles.emptySubtext}>
                Be the first to create a post! Click + to get started.
              </p>
            </motion.div>
          )}

          {/* Posts */}
          <div className={styles.postsList}>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <PostCard
                  post={post}
                  onAppreciate={handleAppreciate}
                  onPick={handlePick}
                />
              </motion.div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>{error}</p>
              <button
                onClick={() => fetchPosts(0)}
                className={styles.retryButton}
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Loading Indicator */}
          {isLoadingPosts && posts.length === 0 && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading posts...</p>
            </div>
          )}

          {isLoadingPosts && posts.length > 0 && (
            <div className={styles.loadingMore}>
              <div className={styles.spinnerSmall} />
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} className={styles.observerTarget} />

          {/* End of Feed */}
          {!hasMorePosts && posts.length > 0 && (
            <div className={styles.endOfFeed}>
              <p>You've reached the end of your feed</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
