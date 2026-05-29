"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  ShoppingBag,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  RefreshCw,
} from "lucide-react";
import type { PostWithDetails } from "@/types";
import styles from "./post-card.module.css";

interface Appreciator {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  created_at: string;
}

interface PostCardProps {
  post: PostWithDetails;
  onAppreciate?: (postId: string) => void;
  onPick?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onProductClick?: (postId: string) => void;
}

import { useAuth } from "@/components/providers/auth-provider";
import CommentSheet from "./comment-sheet";
import ReportModal from "./report-modal";

export default function PostCard({
  post,
  onAppreciate,
  onPick,
  onComment,
  onShare,
  onProductClick,
}: PostCardProps) {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isAppreciated, setIsAppreciated] = useState(post.is_appreciated ?? false);
  const [isPicked, setIsPicked] = useState(post.is_picked ?? false);
  const [appreciateCount, setAppreciateCount] = useState(post.appreciate_count);
  const [showAppreciates, setShowAppreciates] = useState(false);
  const [appreciators, setAppreciators] = useState<Appreciator[]>([]);
  const [loadingAppreciates, setLoadingAppreciates] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showDoubleTap, setShowDoubleTap] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const lastTapRef = useRef<number>(0);

  // Share overlay and toast states
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Options menu states
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<"post" | "user">("post");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportTargetLabel, setReportTargetLabel] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [hiddenReason, setHiddenReason] = useState<"post_deleted" | "user_blocked" | "user_muted" | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    // Auto-dismiss after 3 seconds
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Post deleted successfully");
        setIsHidden(true);
        setHiddenReason("post_deleted");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to delete post");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting post");
    } finally {
      setShowOptionsMenu(false);
    }
  };

  const handleBlockUser = async () => {
    if (!confirm(`Are you sure you want to block @${post.user.username}?`)) return;
    try {
      const res = await fetch(`/api/users/${post.user.username}/block`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`Blocked @${post.user.username}`);
        setIsHidden(true);
        setHiddenReason("user_blocked");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to block user");
      }
    } catch (err) {
      console.error(err);
      showToast("Error blocking user");
    } finally {
      setShowOptionsMenu(false);
    }
  };

  const handleMuteUser = async () => {
    if (!confirm(`Are you sure you want to mute @${post.user.username}?`)) return;
    try {
      const res = await fetch(`/api/users/${post.user.username}/mute`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`Muted @${post.user.username}`);
        setIsHidden(true);
        setHiddenReason("user_muted");
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to mute user");
      }
    } catch (err) {
      console.error(err);
      showToast("Error muting user");
    } finally {
      setShowOptionsMenu(false);
    }
  };

  const handleOpenReportPost = () => {
    setReportTarget("post");
    setReportTargetId(post.id);
    setReportTargetLabel("this post");
    setShowOptionsMenu(false);
    setShowReportModal(true);
  };

  const handleOpenReportUser = () => {
    setReportTarget("user");
    setReportTargetId(post.user.username);
    setReportTargetLabel(`@${post.user.username}`);
    setShowOptionsMenu(false);
    setShowReportModal(true);
  };

  const handleCopyLink = () => {
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      navigator.clipboard.writeText(postUrl);
      showToast("Link copied to clipboard!");
    } catch (err) {
      showToast("Failed to copy link");
    } finally {
      setShowShareMenu(false);
    }
  };

  const handleRepostToDisplays = async () => {
    if (!currentUserId) {
      showToast("Please log in to repost");
      setShowShareMenu(false);
      return;
    }
    
    setIsReposting(true);
    try {
      const response = await fetch("/api/displays/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_post_id: post.id }),
      });

      if (response.ok) {
        showToast("Shared to displays!");
      } else {
        if (response.status === 401) {
          showToast("Please log in to repost");
        } else {
          const errorData = await response.json().catch(() => ({}));
          showToast(errorData.message || "Failed to share to displays");
        }
      }
    } catch (err) {
      console.error("Repost error:", err);
      showToast("Failed to share to displays");
    } finally {
      setIsReposting(false);
      setShowShareMenu(false);
    }
  };

  const handleCommentCountChange = (countChange: number) => {
    setCommentCount((c) => Math.max(0, c + countChange));
  };

  const media = post.media || [];
  const products = post.products || [];
  const hasMultipleMedia = media.length > 1;

  const activeMedia = media[currentMediaIndex];
  let aspectVal = "1/1";
  if (activeMedia?.aspect_ratio) {
    if (activeMedia.aspect_ratio.includes(":")) {
      aspectVal = activeMedia.aspect_ratio.replace(":", "/");
    } else {
      aspectVal = activeMedia.aspect_ratio;
    }
  }
  const aspectStyle = { aspectRatio: aspectVal };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap — appreciate
      if (!isAppreciated) {
        setIsAppreciated(true);
        setAppreciateCount((c) => c + 1);
        onAppreciate?.(post.id);
      }
      setShowDoubleTap(true);
      setTimeout(() => setShowDoubleTap(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleAppreciate = () => {
    setIsAppreciated(!isAppreciated);
    setAppreciateCount((c) => (isAppreciated ? c - 1 : c + 1));
    onAppreciate?.(post.id);
  };

  const handlePick = () => {
    setIsPicked(!isPicked);
    onPick?.(post.id);
  };

  const fetchAppreciates = async () => {
    if (loadingAppreciates) return;
    setLoadingAppreciates(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/appreciates`);
      if (response.ok) {
        const data = await response.json();
        setAppreciators(data.appreciates || []);
      }
    } catch (err) {
      console.error("Failed to fetch appreciates:", err);
    } finally {
      setLoadingAppreciates(false);
    }
  };

  const handleShowAppreciates = async () => {
    if (!showAppreciates) {
      await fetchAppreciates();
    }
    setShowAppreciates(!showAppreciates);
  };

  const nextMedia = () => {
    setCurrentMediaIndex((i) => Math.min(i + 1, media.length - 1));
  };

  const prevMedia = () => {
    setCurrentMediaIndex((i) => Math.max(i - 1, 0));
  };

  if (isHidden) {
    return (
      <div className={styles.hiddenCard}>
        {hiddenReason === "post_deleted" && "Post deleted."}
        {hiddenReason === "user_blocked" && `Blocked @${post.user.username}. Content hidden.`}
        {hiddenReason === "user_muted" && `Muted @${post.user.username}. Content hidden.`}
      </div>
    );
  }

  return (
    <article className={styles.card} id={`post-${post.id}`}>
      {/* Header */}
      <div className={styles.header}>
        <Link
          href={`/profile/${post.user.username}`}
          className={styles.userInfo}
        >
          <div className={styles.avatar}>
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.username}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {post.user.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.username}>{post.user.username}</span>
            {post.city && (
              <span className={styles.location}>{post.city}</span>
            )}
          </div>
        </Link>
        <button
          className={styles.moreBtn}
          onClick={() => setShowOptionsMenu(true)}
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Media */}
      <div className={styles.mediaContainer} onClick={handleDoubleTap} style={aspectStyle}>
        {media.length > 0 && (
          <>
            <div className={styles.mediaWrapper}>
              {media[currentMediaIndex]?.media_type === "video" ? (
                <video
                  src={media[currentMediaIndex].media_url}
                  className={styles.media}
                  playsInline
                  muted
                  loop
                  autoPlay
                />
              ) : (
                <Image
                  src={media[currentMediaIndex]?.media_url || "/placeholder.jpg"}
                  alt={post.caption || "Post image"}
                  fill
                  className={styles.media}
                  sizes="(max-width: 480px) 100vw, 480px"
                  priority={false}
                />
              )}
            </div>

            {/* Carousel Navigation */}
            {hasMultipleMedia && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    className={`${styles.carouselBtn} ${styles.carouselPrev}`}
                    onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                    aria-label="Previous"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {currentMediaIndex < media.length - 1 && (
                  <button
                    className={`${styles.carouselBtn} ${styles.carouselNext}`}
                    onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                    aria-label="Next"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
                <div className={styles.dots}>
                  {media.map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.dot} ${
                        i === currentMediaIndex ? styles.dotActive : ""
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Double-tap heart animation */}
            {showDoubleTap && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={styles.doubleTapHeart}
              >
                <Heart size={64} fill="white" color="white" />
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <button
            className={`${styles.actionBtn} ${
              isAppreciated ? styles.appreciated : ""
            }`}
            onClick={handleAppreciate}
            aria-label="Appreciate"
            id={`appreciate-${post.id}`}
          >
            <Heart
              size={22}
              fill={isAppreciated ? "currentColor" : "none"}
              strokeWidth={isAppreciated ? 0 : 1.8}
            />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => {
              setShowComments(true);
              onComment?.(post.id);
            }}
            aria-label="Comment"
          >
            <MessageCircle size={22} strokeWidth={1.8} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => {
              setShowShareMenu(true);
              onShare?.(post.id);
            }}
            aria-label="Share"
          >
            <Share2 size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.actionsRight}>
          {products.length > 0 && (
            <button
              className={styles.buyBtn}
              onClick={() => onProductClick?.(post.id)}
              aria-label="View products"
            >
              <ShoppingBag size={16} />
              View
            </button>
          )}
          <button
            className={`${styles.actionBtn} ${isPicked ? styles.picked : ""}`}
            onClick={handlePick}
            aria-label="Pick/Save"
            id={`pick-${post.id}`}
          >
            <Bookmark
              size={22}
              fill={isPicked ? "currentColor" : "none"}
              strokeWidth={isPicked ? 0 : 1.8}
            />
          </button>
        </div>
      </div>

      {/* Appreciate Count */}
      {appreciateCount > 0 && (
        <button
          className={styles.appreciateCount}
          onClick={handleShowAppreciates}
          aria-label="View who appreciated"
        >
          {appreciateCount.toLocaleString()} appreciate
          {appreciateCount !== 1 ? "s" : ""}
        </button>
      )}

      {/* Appreciates Modal */}
      {showAppreciates && (
        <motion.div
          className={styles.appreciatesModal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAppreciates(false)}
        >
          <motion.div
            className={styles.appreciatesContent}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.appreciatesHeader}>
              <h3>Appreciated by</h3>
              <button
                className={styles.closeAppreciates}
                onClick={() => setShowAppreciates(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.appreciatesList}>
              {loadingAppreciates ? (
                <p className={styles.loadingText}>Loading...</p>
              ) : appreciators.length === 0 ? (
                <p className={styles.noAppreciators}>No one has appreciated yet</p>
              ) : (
                appreciators.map((appreciator) => (
                  <Link
                    key={appreciator.user.id}
                    href={`/profile/${appreciator.user.username}`}
                    className={styles.appreciatorItem}
                    onClick={() => setShowAppreciates(false)}
                  >
                    <div className={styles.appreciatorAvatar}>
                      {appreciator.user.avatar_url ? (
                        <img
                          src={appreciator.user.avatar_url}
                          alt={appreciator.user.username}
                          className={styles.appreciatorAvatarImg}
                        />
                      ) : (
                        <div className={styles.appreciatorAvatarPlaceholder}>
                          {appreciator.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.appreciatorInfo}>
                      <span className={styles.appreciatorUsername}>
                        {appreciator.user.username}
                      </span>
                      <span className={styles.appreciatorTime}>
                        {getRelativeTime(appreciator.created_at)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className={styles.captionArea}>
          <span className={styles.captionUsername}>{post.user.username}</span>{" "}
          <span
            className={`${styles.captionText} ${
              !showFullCaption ? styles.captionTruncated : ""
            }`}
          >
            {post.caption}
          </span>
          {post.caption.length > 100 && !showFullCaption && (
            <button
              className={styles.moreText}
              onClick={() => setShowFullCaption(true)}
            >
              more
            </button>
          )}
        </div>
      )}

      {/* Comment Count */}
      {commentCount > 0 && (
        <button
          className={styles.viewComments}
          onClick={() => {
            setShowComments(true);
            onComment?.(post.id);
          }}
        >
          View all {commentCount} comment
          {commentCount !== 1 ? "s" : ""}
        </button>
      )}

      {/* Timestamp */}
      <time className={styles.timestamp}>
        {getRelativeTime(post.created_at)}
      </time>

      {/* Comments Drawer Sheet */}
      <CommentSheet
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        currentUserId={currentUserId}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* Share Overlay Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            className={styles.shareOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              className={styles.shareMenu}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.shareHeader}>
                <h3>Share Options</h3>
                <button
                  className={styles.closeShare}
                  onClick={() => setShowShareMenu(false)}
                  aria-label="Close Share Menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.shareOptions}>
                <button
                  className={styles.shareOption}
                  onClick={handleCopyLink}
                >
                  <div className={styles.shareOptionIcon}>
                    <Copy size={20} />
                  </div>
                  <div className={styles.shareOptionText}>
                    <span className={styles.shareOptionTitle}>Copy Link</span>
                    <span className={styles.shareOptionSub}>Copy post link to clipboard</span>
                  </div>
                </button>

                <button
                  className={styles.shareOption}
                  onClick={handleRepostToDisplays}
                  disabled={isReposting}
                >
                  <div className={styles.shareOptionIcon}>
                    {isReposting ? (
                      <RefreshCw size={20} className={styles.spinnerIcon} />
                    ) : (
                      <RefreshCw size={20} />
                    )}
                  </div>
                  <div className={styles.shareOptionText}>
                    <span className={styles.shareOptionTitle}>Share to Displays</span>
                    <span className={styles.shareOptionSub}>Repost this to your displays strip</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
            transition={{ duration: 0.2 }}
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Overlay Menu */}
      <AnimatePresence>
        {showOptionsMenu && (
          <motion.div
            className={styles.optionsOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOptionsMenu(false)}
          >
            <motion.div
              className={styles.optionsMenu}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.optionsList}>
                {currentUserId === post.user_id ? (
                  <button
                    className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                    onClick={handleDeletePost}
                  >
                    Delete Post
                  </button>
                ) : (
                  <>
                    <button
                      className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                      onClick={handleOpenReportPost}
                    >
                      Report Post
                    </button>
                    <button
                      className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                      onClick={handleOpenReportUser}
                    >
                      Report User
                    </button>
                    <button
                      className={styles.optionBtn}
                      onClick={handleBlockUser}
                    >
                      Block @{post.user.username}
                    </button>
                    <button
                      className={styles.optionBtn}
                      onClick={handleMuteUser}
                    >
                      Mute @{post.user.username}
                    </button>
                  </>
                )}
                <button
                  className={`${styles.optionBtn} ${styles.optionBtnCancel}`}
                  onClick={() => setShowOptionsMenu(false)}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={reportTarget}
        targetId={reportTargetId}
        targetLabel={reportTargetLabel}
      />
    </article>
  );
}

function getRelativeTime(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

