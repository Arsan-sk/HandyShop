"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Smile,
} from "lucide-react";
import type { PostWithDetails, Comment } from "@/types";
import styles from "./post-overlay-modal.module.css";

interface CommentWithUser extends Comment {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface PostOverlayModalProps {
  post: PostWithDetails;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function PostOverlayModal({
  post,
  isOpen,
  onClose,
  currentUserId,
  onPrev,
  onNext,
}: PostOverlayModalProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Interaction States
  const [isAppreciated, setIsAppreciated] = useState(post.is_appreciated ?? false);
  const [appreciateCount, setAppreciateCount] = useState(post.appreciate_count ?? 0);
  const [isPicked, setIsPicked] = useState(post.is_picked ?? false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Sync post state
  useEffect(() => {
    setIsAppreciated(post.is_appreciated ?? false);
    setAppreciateCount(post.appreciate_count ?? 0);
    setIsPicked(post.is_picked ?? false);

    if (currentUserId && post.user?.username) {
      const checkFollow = async () => {
        try {
          const res = await fetch(`/api/users/${post.user.username}`);
          if (res.ok) {
            const data = await res.json();
            setIsFollowing(data.isFollowing ?? false);
          }
        } catch (err) {
          console.error("Failed to check follow:", err);
        }
      };
      checkFollow();
    }
  }, [post, currentUserId]);

  // Fetch comments
  useEffect(() => {
    if (!isOpen || !post.id) return;

    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        const response = await fetch(`/api/posts/${post.id}/comments`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Error loading comments:", err);
      } finally {
        setIsLoadingComments(false);
      }
    };

    fetchComments();
  }, [post.id, isOpen]);

  const toggleAppreciate = async () => {
    const nextVal = !isAppreciated;
    setIsAppreciated(nextVal);
    setAppreciateCount((c) => (nextVal ? c + 1 : c - 1));
    try {
      await fetch(`/api/posts/${post.id}/appreciate`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
  };

  const togglePick = async () => {
    setIsPicked(!isPicked);
    try {
      await fetch(`/api/posts/${post.id}/pick`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId || !post.user?.username) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${post.user.username}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setCommentBody("");
        // Scroll comments to bottom
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const mediaSource = post.media?.[0]?.media_url;
  const mediaType = post.media?.[0]?.media_type || "image";

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Just now" : `${diffMins}m`;
      }
      return `${diffHours}h`;
    }
    return `${diffDays}d`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.modalOverlay}>
          {/* Dark Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Close Button top-right */}
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <X size={26} />
          </button>

          {/* Viewport Chevrons */}
          {onPrev && (
            <button className={`${styles.navChevron} ${styles.prevChevron}`} onClick={onPrev}>
              <ChevronLeft size={24} />
            </button>
          )}
          {onNext && (
            <button className={`${styles.navChevron} ${styles.nextChevron}`} onClick={onNext}>
              <ChevronRight size={24} />
            </button>
          )}

          {/* Center Post Card Box */}
          <motion.div
            className={styles.modalContent}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Left Column: Media Panel */}
            <div className={styles.mediaPanel}>
              {mediaSource ? (
                mediaType === "video" ? (
                  <video
                    src={mediaSource}
                    className={styles.mediaItem}
                    controls
                    loop
                    playsInline
                    autoPlay
                    muted
                  />
                ) : (
                  <img src={mediaSource} alt="Post content" className={styles.mediaItem} />
                )
              ) : (
                <div className={styles.textOnlyFallback}>
                  <p className={styles.fallbackCaption}>{post.caption}</p>
                </div>
              )}
            </div>

            {/* Right Column: Interaction & Comments Panel */}
            <div className={styles.commentsPanel}>
              {/* Header: Publisher Info */}
              <div className={styles.panelHeader}>
                <div className={styles.authorGroup}>
                  <Link href={`/profile/${post.user.username}`} className={styles.avatar}>
                    {post.user.avatar_url ? (
                      <img src={post.user.avatar_url} alt={post.user.username} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {post.user.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className={styles.authorMeta}>
                    <div className={styles.nameRow}>
                      <Link href={`/profile/${post.user.username}`} className={styles.username}>
                        {post.user.username}
                      </Link>
                      {currentUserId !== post.user_id && (
                        <>
                          <span className={styles.separator}>•</span>
                          <button
                            onClick={toggleFollow}
                            disabled={followLoading}
                            className={`${styles.followBtn} ${isFollowing ? styles.following : ""}`}
                          >
                            {isFollowing ? "Following" : "Follow"}
                          </button>
                        </>
                      )}
                    </div>
                    {post.media?.[0]?.duration_seconds ? (
                      <span className={styles.audioLabel}>Original audio</span>
                    ) : (
                      <span className={styles.locationLabel}>{post.city || "HandyShop"}</span>
                    )}
                  </div>
                </div>
                <button className={styles.optionsBtn} aria-label="More options">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* Scrollable description & comments area */}
              <div className={styles.scrollableContent}>
                {/* Caption (First comment) */}
                <div className={styles.commentRow}>
                  <div className={styles.avatar}>
                    {post.user.avatar_url ? (
                      <img src={post.user.avatar_url} alt={post.user.username} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {post.user.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.commentDetails}>
                    <p className={styles.commentText}>
                      <Link href={`/profile/${post.user.username}`} className={styles.commentUsername}>
                        {post.user.username}
                      </Link>{" "}
                      {post.caption}
                    </p>
                    {post.products?.[0]?.category_id && (
                      <div className={styles.tagsContainer}>
                        <span className={styles.categoryTag}>#{post.products[0].category_id}</span>
                      </div>
                    )}
                    <span className={styles.commentTime}>{getRelativeTime(post.created_at)}</span>
                  </div>
                </div>

                {/* List of comments */}
                {isLoadingComments ? (
                  <div className={styles.loadingSpinner}>
                    <div className={styles.spinner} />
                  </div>
                ) : comments.length === 0 ? (
                  <div className={styles.noComments}>
                    <p>No comments yet.</p>
                    <span>Start the conversation.</span>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={styles.commentRow}>
                      <div className={styles.avatar}>
                        {comment.user.avatar_url ? (
                          <img src={comment.user.avatar_url} alt={comment.user.username} className={styles.avatarImg} />
                        ) : (
                          <div className={styles.avatarFallback}>
                            {comment.user.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className={styles.commentDetails}>
                        <p className={styles.commentText}>
                          <span className={styles.commentUsername}>{comment.user.username}</span>{" "}
                          {comment.body}
                        </p>
                        <div className={styles.commentMetaRow}>
                          <span className={styles.commentTime}>{getRelativeTime(comment.created_at)}</span>
                          <button className={styles.commentReplyBtn}>Reply</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Footer: Action icons and comment form */}
              <div className={styles.panelFooter}>
                <div className={styles.actionsStrip}>
                  <div className={styles.leftActions}>
                    {/* Heart Button */}
                    <div className={styles.iconWithLabel}>
                      <button
                        onClick={toggleAppreciate}
                        className={`${styles.actionIcon} ${isAppreciated ? styles.appreciated : ""}`}
                        aria-label="Appreciate"
                      >
                        <Heart size={24} fill={isAppreciated ? "currentColor" : "none"} />
                      </button>
                      {/* Hide count unless it's > 0 (or liked) */}
                      {appreciateCount > 0 && (
                        <span className={styles.actionCount}>{appreciateCount}</span>
                      )}
                    </div>

                    {/* Comment Button */}
                    <div className={styles.iconWithLabel}>
                      <button className={styles.actionIcon} aria-label="Comment">
                        <MessageCircle size={24} />
                      </button>
                      {/* Hide count unless it's > 0 */}
                      {comments.length > 0 && (
                        <span className={styles.actionCount}>{comments.length}</span>
                      )}
                    </div>

                    <button className={styles.actionIcon} aria-label="Share">
                      <Send size={24} />
                    </button>
                  </div>

                  <button
                    onClick={togglePick}
                    className={`${styles.actionIcon} ${isPicked ? styles.picked : ""}`}
                    aria-label="Save"
                  >
                    <Bookmark size={24} fill={isPicked ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Likes summary description */}
                {appreciateCount > 0 && (
                  <p className={styles.likesSummary}>
                    Liked by{" "}
                    <span className={styles.boldText}>
                      {isAppreciated ? "you" : post.user?.username || "others"}
                    </span>{" "}
                    {appreciateCount > 1 && (
                      <>
                        and <span className={styles.boldText}>{appreciateCount - 1} others</span>
                      </>
                    )}
                  </p>
                )}

                <span className={styles.postAgeLabel}>
                  {new Date(post.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                {/* Add Comment Input */}
                <form onSubmit={handlePostComment} className={styles.commentInputForm}>
                  <Smile size={22} className={styles.emojiIcon} />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className={styles.commentInput}
                  />
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || isSubmittingComment}
                    className={styles.commentSubmitBtn}
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
