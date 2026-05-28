"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Archive, Pin, Eye, Heart, Bookmark, MessageSquare } from "lucide-react";
import type { PostWithDetails } from "@/types";
import styles from "./post-editor-modal.module.css";

interface PostEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostWithDetails | null;
  onSave: () => void;
}

export default function PostEditorModal({
  isOpen,
  onClose,
  post,
  onSave,
}: PostEditorModalProps) {
  const [caption, setCaption] = useState("");
  const [isArchived, setIsArchived] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || "");
      setIsArchived(post.status === "archived");

      // Check pin status from localStorage
      const userId = post.user_id;
      const pinnedListRaw = localStorage.getItem(`pinned_posts_${userId}`);
      if (pinnedListRaw) {
        try {
          const pinnedList = JSON.parse(pinnedListRaw) as string[];
          setIsPinned(pinnedList.includes(post.id));
        } catch {
          setIsPinned(false);
        }
      } else {
        setIsPinned(false);
      }
    }
    setError(null);
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Update text caption & archive status on database
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          status: isArchived ? "archived" : "active",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update post");
      }

      // 2. Handle client-side pinned state in localStorage
      const userId = post.user_id;
      const pinnedKey = `pinned_posts_${userId}`;
      const pinnedListRaw = localStorage.getItem(pinnedKey);
      let pinnedList: string[] = [];
      if (pinnedListRaw) {
        try {
          pinnedList = JSON.parse(pinnedListRaw) as string[];
        } catch {
          pinnedList = [];
        }
      }

      if (isPinned) {
        if (!pinnedList.includes(post.id)) {
          // Add to pins (PRD / features might limit to max 3 pins, but let's keep it simple)
          pinnedList.push(post.id);
        }
      } else {
        pinnedList = pinnedList.filter((id) => id !== post.id);
      }
      localStorage.setItem(pinnedKey, JSON.stringify(pinnedList));

      onSave();
      onClose();
    } catch (err) {
      console.error("[Post Editor] Error saving:", err);
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this post? This cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete post");
      }

      // Remove from pin list in localStorage if it was pinned
      const userId = post.user_id;
      const pinnedKey = `pinned_posts_${userId}`;
      const pinnedListRaw = localStorage.getItem(pinnedKey);
      if (pinnedListRaw) {
        try {
          let pinnedList = JSON.parse(pinnedListRaw) as string[];
          pinnedList = pinnedList.filter((id) => id !== post.id);
          localStorage.setItem(pinnedKey, JSON.stringify(pinnedList));
        } catch {}
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("[Post Editor] Error deleting:", err);
      setError(err instanceof Error ? err.message : "Failed to delete post");
      setIsSubmitting(false);
    }
  };

  const firstMedia = post.media?.[0]?.media_url;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.modalTitle}>Manage Post</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.scrollContent}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* Media Preview & Analytics */}
            <div className={styles.mediaAndStats}>
              {firstMedia && (
                <div className={styles.previewContainer}>
                  {post.media?.[0]?.media_type === "video" ? (
                    <video src={firstMedia} className={styles.previewMedia} muted playsInline />
                  ) : (
                    <img src={firstMedia} alt="Post thumbnail" className={styles.previewMedia} />
                  )}
                </div>
              )}

              <div className={styles.statsContainer}>
                <h3 className={styles.sectionTitle}>Post Analytics</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <Eye size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{post.view_count || 0}</span>
                    <span className={styles.statLabel}>Views</span>
                  </div>
                  <div className={styles.statCard}>
                    <Heart size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{post.appreciate_count || 0}</span>
                    <span className={styles.statLabel}>Appreciates</span>
                  </div>
                  <div className={styles.statCard}>
                    <Bookmark size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{post.pick_count || 0}</span>
                    <span className={styles.statLabel}>Picks</span>
                  </div>
                  <div className={styles.statCard}>
                    <MessageSquare size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{post.comment_count || 0}</span>
                    <span className={styles.statLabel}>Comments</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption Editor */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Caption</label>
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className={styles.textarea}
                rows={4}
              />
            </div>

            {/* Settings Toggles */}
            <div className={styles.togglesSection}>
              <h3 className={styles.sectionTitle}>Visibility & Pinning</h3>

              <div className={styles.toggleItem}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>
                    <Archive size={16} />
                    <span>Archive Post</span>
                  </div>
                  <p className={styles.toggleDescription}>
                    Archived posts are hidden from your public profile grid but kept on your device.
                  </p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleItem}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>
                    <Pin size={16} />
                    <span>Pin to Profile</span>
                  </div>
                  <p className={styles.toggleDescription}>
                    Pinned posts appear at the very top of your profile grid.
                  </p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteBtn}
              disabled={isSubmitting}
            >
              <Trash2 size={16} />
              <span>Delete Post</span>
            </button>

            <div className={styles.rightActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
