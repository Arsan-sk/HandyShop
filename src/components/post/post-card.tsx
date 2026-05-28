"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
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

  const handleCommentCountChange = (countChange: number) => {
    setCommentCount((c) => Math.max(0, c + countChange));
  };

  const media = post.media || [];
  const products = post.products || [];
  const hasMultipleMedia = media.length > 1;

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
              <Image
                src={post.user.avatar_url}
                alt={post.user.username}
                width={36}
                height={36}
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
        <button className={styles.moreBtn} aria-label="More options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Media */}
      <div className={styles.mediaContainer} onClick={handleDoubleTap}>
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
            onClick={() => onShare?.(post.id)}
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
                        <Image
                          src={appreciator.user.avatar_url}
                          alt={appreciator.user.username}
                          width={40}
                          height={40}
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
