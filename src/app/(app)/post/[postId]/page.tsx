"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import PostCard from "@/components/post/post-card";
import { PostWithDetails } from "@/types";
import styles from "./post-view.module.css";

interface PostViewProps {
  params: Promise<{ postId: string }>;
}

export default function SinglePostPage({ params }: PostViewProps) {
  const router = useRouter();
  const { postId } = use(params);

  const [post, setPost] = useState<PostWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Post not found");
        }
        throw new Error("Failed to load post");
      }
      const data = await response.json();
      setPost(data.post);
    } catch (err) {
      console.error("[SinglePostPage] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const handleAppreciate = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}/appreciate`, {
        method: "POST",
      });
      if (response.ok) {
        setPost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            is_appreciated: !prev.is_appreciated,
            appreciate_count: prev.is_appreciated
              ? prev.appreciate_count - 1
              : prev.appreciate_count + 1,
          };
        });
      }
    } catch (err) {
      console.error("Appreciate action error:", err);
    }
  };

  const handlePick = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}/pick`, {
        method: "POST",
      });
      if (response.ok) {
        setPost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            is_picked: !prev.is_picked,
            pick_count: prev.is_picked ? prev.pick_count - 1 : prev.pick_count + 1,
          };
        });
      }
    } catch (err) {
      console.error("Pick action error:", err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <span className={styles.title}>Post</span>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </div>

      <main className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading post...</p>
          </div>
        ) : error || !post ? (
          <div className={styles.errorContainer}>
            <p>{error || "This post is unavailable."}</p>
            <button onClick={() => router.push("/home")} className={styles.homeBtn}>
              Go Home
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={styles.cardWrapper}
          >
            <PostCard
              post={post}
              onAppreciate={handleAppreciate}
              onPick={handlePick}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
