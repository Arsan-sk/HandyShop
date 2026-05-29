"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  ShoppingBag,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
  RefreshCw,
  X,
  Send,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import CommentSheet from "@/components/post/comment-sheet";
import ReportModal from "@/components/post/report-modal";
import ProductSheet from "@/components/product/product-sheet";
import styles from "./quicklook.module.css";

interface PublisherDetailsProps {
  video: any;
  currentUserId: string | undefined;
  isFollowing: boolean;
  followLoading: boolean;
  handleFollowToggle: (e: React.MouseEvent) => void;
  showFullCaption: boolean;
  setShowFullCaption: (val: boolean) => void;
  featuredProduct: any;
  onOpenProductSheet: (product: any, shopName: string, shopCity: string) => void;
}

function PublisherDetails({
  video,
  currentUserId,
  isFollowing,
  followLoading,
  handleFollowToggle,
  showFullCaption,
  setShowFullCaption,
  featuredProduct,
  onOpenProductSheet,
}: PublisherDetailsProps) {
  return (
    <div className={styles.details}>
      {/* Author info */}
      <div className={styles.authorRow}>
        <Link href={`/profile/${video.user.username}`} className={styles.avatar}>
          {video.user.avatar_url ? (
            <img src={video.user.avatar_url} alt={video.user.username} className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {video.user.username[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <Link href={`/profile/${video.user.username}`} className={styles.username}>
          {video.user.username}
        </Link>

        {/* Follow button (only if not viewing own content) */}
        {currentUserId !== video.user_id && (
          <button
            className={`${styles.followBtn} ${isFollowing ? styles.followingBtn : ""}`}
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Caption */}
      {video.caption && (
        <div>
          <p
            className={`${styles.caption} ${showFullCaption ? styles.captionExpanded : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {video.caption}
          </p>
          {video.caption.length > 80 && (
            <button
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                setShowFullCaption(!showFullCaption);
              }}
            >
              {showFullCaption ? "less" : "more"}
            </button>
          )}
        </div>
      )}

      {/* Category tag */}
      {video.category_id && (
        <span className={styles.categoryTag}>{video.category_id}</span>
      )}

      {/* Product Card Badging */}
      {featuredProduct && (
        <div
          className={styles.productLink}
          onClick={(e) => {
            e.stopPropagation();
            onOpenProductSheet(featuredProduct, video.user.username, video.city || "");
          }}
        >
          <ShoppingBag size={14} />
          <span>Featured: {featuredProduct.title}</span>
          <span className={styles.productPrice}>₹{featuredProduct.price.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

interface ActionButtonsProps {
  video: any;
  isAppreciated: boolean;
  appreciateCount: number;
  toggleAppreciate: (e: React.MouseEvent) => void;
  onOpenComments: (postId: string) => void;
  isPicked: boolean;
  togglePick: (e: React.MouseEvent) => void;
  onOpenOptionsMenu: (index: number) => void;
  slideIndex: number;
  isDesktop?: boolean;
}

function ActionButtons({
  video,
  isAppreciated,
  appreciateCount,
  toggleAppreciate,
  onOpenComments,
  isPicked,
  togglePick,
  onOpenOptionsMenu,
  slideIndex,
  isDesktop = false,
}: ActionButtonsProps) {
  return (
    <div className={`${styles.actions} ${isDesktop ? styles.desktopActionsOnly : styles.mobileActionsOnly}`}>
      {/* Appreciate */}
      <div className={styles.actionItem}>
        <button
          className={`${styles.actionButton} ${isAppreciated ? styles.actionButtonActive : ""}`}
          onClick={toggleAppreciate}
        >
          <Heart size={22} fill={isAppreciated ? "currentColor" : "none"} />
        </button>
        {/* Hide counts unless count > 0 */}
        {appreciateCount > 0 && (
          <span className={styles.actionLabel}>
            {isDesktop ? "Likes" : ""}
            <span className={isDesktop ? styles.actionCountDesktop : ""}>
              {appreciateCount.toLocaleString()}
            </span>
          </span>
        )}
      </div>

      {/* Comments */}
      <div className={styles.actionItem}>
        <button className={styles.actionButton} onClick={() => onOpenComments(video.id)}>
          <MessageCircle size={22} />
        </button>
        {/* Hide counts unless count > 0 */}
        {(video.comment_count ?? 0) > 0 && (
          <span className={styles.actionLabel}>
            {isDesktop ? "Comments" : ""}
            <span className={isDesktop ? styles.actionCountDesktop : ""}>
              {(video.comment_count ?? 0).toLocaleString()}
            </span>
          </span>
        )}
      </div>

      {/* Share */}
      <div className={styles.actionItem}>
        <button className={styles.actionButton} onClick={() => onOpenComments(video.id)}>
          <Send size={22} />
        </button>
      </div>

      {/* Pick/Save */}
      <div className={styles.actionItem}>
        <button
          className={`${styles.actionButton} ${isPicked ? styles.actionButtonSaved : ""}`}
          onClick={togglePick}
        >
          <Bookmark size={22} fill={isPicked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* 3 Dot Actions */}
      <button className={styles.actionButton} onClick={() => onOpenOptionsMenu(slideIndex)}>
        <MoreHorizontal size={22} />
      </button>
    </div>
  );
}

interface QuickLookVideoProps {
  video: any;
  isActive: boolean;
  globallyMuted: boolean;
  onMuteToggle: () => void;
  onOpenComments: (postId: string) => void;
  onOpenOptionsMenu: (index: number) => void;
  onOpenProductSheet: (product: any, shopName: string, shopCity: string) => void;
  currentUserId: string | undefined;
  slideIndex: number;
  onPrev?: () => void;
  onNext?: () => void;
}

function QuickLookVideoPlayer({
  video,
  isActive,
  globallyMuted,
  onMuteToggle,
  onOpenComments,
  onOpenOptionsMenu,
  onOpenProductSheet,
  currentUserId,
  slideIndex,
  onPrev,
  onNext,
}: QuickLookVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAppreciated, setIsAppreciated] = useState(video.is_appreciated ?? false);
  const [isPicked, setIsPicked] = useState(video.is_picked ?? false);
  const [appreciateCount, setAppreciateCount] = useState<number>(video.appreciate_count ?? 0);
  
  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Interaction feedback overlays
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showPlayPauseIndicator, setShowPlayPauseIndicator] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const lastTapRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Fetch follow status on mount or video change
  useEffect(() => {
    if (!currentUserId || !video?.user?.id) return;
    
    const checkFollowStatus = async () => {
      try {
        const res = await fetch(`/api/users/${video.user.username}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.isFollowing ?? false);
        }
      } catch (err) {
        console.error("Failed to check follow status:", err);
      }
    };
    checkFollowStatus();
  }, [currentUserId, video?.user?.username, video?.user?.id]);

  // Autoplay/Pause and Watch Time Tracking
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive) {
      // Play video
      videoEl.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Autoplay block caught: ", err);
          setIsPlaying(false);
        });
      
      // Start watch timer
      startTimeRef.current = Date.now();
    } else {
      // Pause video
      videoEl.pause();
      setIsPlaying(false);

      // Track watch time on exit
      if (startTimeRef.current !== null) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        startTimeRef.current = null;

        if (elapsed > 0.5) {
          fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "post_view",
              target_post_id: video.id,
              target_user_id: video.user_id,
              metadata: {
                watch_time_seconds: elapsed,
                completed: elapsed >= (videoEl.duration || 15),
                is_quicklook: true,
              },
            }),
          }).catch((err) => console.error("Failed to send watch analytics:", err));
        }
      }
    }

    return () => {
      // Ensure we track watch time if unmounting
      if (isActive && startTimeRef.current !== null) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        startTimeRef.current = null;

        if (elapsed > 0.5) {
          fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "post_view",
              target_post_id: video.id,
              target_user_id: video.user_id,
              metadata: {
                watch_time_seconds: elapsed,
                is_quicklook: true,
              },
            }),
          }).catch((err) => console.error("Unmount analytics error:", err));
        }
      }
    };
  }, [isActive, video.id, video.user_id]);

  const handleVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTapAppreciate();
    } else {
      onMuteToggle();
      setShowVolumeIndicator(true);
      setTimeout(() => setShowVolumeIndicator(false), 1000);
    }
    lastTapRef.current = now;
  };

  const handleDoubleTapAppreciate = () => {
    if (!isAppreciated) {
      setIsAppreciated(true);
      setAppreciateCount((c: number) => c + 1);
      triggerAppreciateAPI();
    }
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 1000);
  };

  const toggleAppreciate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAppreciated(!isAppreciated);
    setAppreciateCount((c: number) => (isAppreciated ? c - 1 : c + 1));
    triggerAppreciateAPI();
  };

  const triggerAppreciateAPI = async () => {
    try {
      await fetch(`/api/posts/${video.id}/appreciate`, { method: "POST" });
    } catch (err) {
      console.error("Failed to appreciate video:", err);
    }
  };

  const togglePick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPicked(!isPicked);
    triggerPickAPI();
  };

  const triggerPickAPI = async () => {
    try {
      await fetch(`/api/posts/${video.id}/pick`, { method: "POST" });
    } catch (err) {
      console.error("Failed to pick/save video:", err);
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;

    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${video.user.username}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const productRelationship = video.products?.[0];
  const featuredProduct = productRelationship?.product;
  const videoSource = video.media?.[0]?.media_url;

  // Compute precise aspect ratio
  const aspectStr = video.media?.[0]?.aspect_ratio || "9:16";
  let aspectNum = 0.5625;
  if (typeof aspectStr === "string") {
    if (aspectStr.includes(":")) {
      const [w, h] = aspectStr.split(":").map(Number);
      if (w && h) {
        aspectNum = w / h;
      }
    } else {
      const parsed = parseFloat(aspectStr);
      if (!isNaN(parsed) && parsed > 0) {
        aspectNum = parsed;
      }
    }
  }

  const isLandscape = aspectNum > 0.95;

  return (
    <div className={styles.playerContainer} style={{ "--aspect-ratio-value": aspectNum } as React.CSSProperties}>
      {/* Left Column (Desktop Only, Portrait Only) */}
      <div className={`${styles.desktopDetailsColumn} ${isLandscape ? styles.hidden : ""}`}>
        <PublisherDetails
          video={video}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          followLoading={followLoading}
          handleFollowToggle={handleFollowToggle}
          showFullCaption={showFullCaption}
          setShowFullCaption={setShowFullCaption}
          featuredProduct={featuredProduct}
          onOpenProductSheet={onOpenProductSheet}
        />
      </div>

      {/* Center Column: Video Card */}
      <div className={styles.playerCard}>
        <div className={styles.videoWrapper} onClick={handleVideoTap}>
          {videoSource ? (
            <video
              ref={videoRef}
              src={videoSource}
              className={styles.video}
              loop
              playsInline
              muted={globallyMuted}
              preload="auto"
            />
          ) : (
            <div className={styles.loadingState}>No Media Url Available</div>
          )}

          <div className={styles.overlay} />
        </div>

        {/* Floating Indicators inside card */}
        <AnimatePresence>
          {showVolumeIndicator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={styles.volumeIndicator}
            >
              {globallyMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
            </motion.div>
          )}

          {showPlayPauseIndicator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={styles.playPauseIndicator}
            >
              {isPlaying ? <Play size={32} /> : <Pause size={32} />}
            </motion.div>
          )}

          {showDoubleTapHeart && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 1.6 }}
              className={styles.doubleTapHeart}
            >
              <Heart size={80} fill="#e74c3c" color="#e74c3c" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details inside card (Mobile ALWAYS, Landscape Desktop) */}
        <div className={`${styles.mobileDetailsContainer} ${!isLandscape ? styles.desktopHidden : ""}`}>
          <PublisherDetails
            video={video}
            currentUserId={currentUserId}
            isFollowing={isFollowing}
            followLoading={followLoading}
            handleFollowToggle={handleFollowToggle}
            showFullCaption={showFullCaption}
            setShowFullCaption={setShowFullCaption}
            featuredProduct={featuredProduct}
            onOpenProductSheet={onOpenProductSheet}
          />
        </div>

        {/* Actions inside card (Mobile ONLY) */}
        <div className={styles.mobileActionsContainer}>
          <ActionButtons
            video={video}
            isAppreciated={isAppreciated}
            appreciateCount={appreciateCount}
            toggleAppreciate={toggleAppreciate}
            onOpenComments={onOpenComments}
            isPicked={isPicked}
            togglePick={togglePick}
            onOpenOptionsMenu={onOpenOptionsMenu}
            slideIndex={slideIndex}
          />
        </div>

        {/* Volume Button at the bottom-right corner overlay inside the video (Instagram style) */}
        <button
          className={styles.volumeControlBtn}
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle();
          }}
        >
          {globallyMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Right Column (Desktop Only - Hugs the card right edge) */}
      <div className={styles.desktopActionsColumn}>
        {/* Desktop Up/Down Navigation Buttons (Placed directly above the action button stack) */}
        <div className={styles.desktopNavigation}>
          <button
            className={styles.navButton}
            onClick={(e) => {
              e.stopPropagation();
              onPrev?.();
            }}
            disabled={!onPrev}
            title="Previous Video"
          >
            <ChevronUp size={20} />
          </button>
          <button
            className={styles.navButton}
            onClick={(e) => {
              e.stopPropagation();
              onNext?.();
            }}
            disabled={!onNext}
            title="Next Video"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        <ActionButtons
          video={video}
          isAppreciated={isAppreciated}
          appreciateCount={appreciateCount}
          toggleAppreciate={toggleAppreciate}
          onOpenComments={onOpenComments}
          isPicked={isPicked}
          togglePick={togglePick}
          onOpenOptionsMenu={onOpenOptionsMenu}
          slideIndex={slideIndex}
          isDesktop={true}
        />
      </div>
    </div>
  );
}

export default function QuickLookPage() {
  const { user: authUser } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [globallyMuted, setGloballyMuted] = useState(true);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<"post" | "user">("post");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportTargetLabel, setReportTargetLabel] = useState("");

  // Options Menu state
  const [showOptionsMenuIndex, setShowOptionsMenuIndex] = useState<number | null>(null);

  // Comments drawer state
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);

  // Product detail sheet state
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [productShopName, setProductShopName] = useState("");
  const [productShopCity, setProductShopCity] = useState("");

  // Share overlay states
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [isReposting, setIsReposting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const swiperRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchVideos = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/quicklook?page=${pageNum}&limit=5`);
      if (!res.ok) {
        throw new Error("Failed to fetch QuickLook feed");
      }
      const data = await res.json();
      const fetchedVideos = data.videos || [];
      
      if (fetchedVideos.length === 0) {
        setHasMore(false);
      } else {
        setVideos((prev) => (pageNum === 0 ? fetchedVideos : [...prev, ...fetchedVideos]));
        setPage(pageNum + 1);
      }
    } catch (err) {
      console.error("[QuickLook Feed] Load error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial feed
  useEffect(() => {
    fetchVideos(0);
  }, [fetchVideos]);

  // CSS Scroll Snap observer to set active video slide index
  useEffect(() => {
    const swiperEl = swiperRef.current;
    if (!swiperEl || videos.length === 0) return;

    const observerOptions = {
      root: swiperEl,
      threshold: 0.6, // Fire when 60% of the video is in view
    };

    const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt((entry.target as HTMLElement).dataset.index || "0");
          setActiveVideoIndex(index);

          // Trigger preload/load of next page when user reaches second to last slide
          if (index >= videos.length - 2 && hasMore && !loading) {
            fetchVideos(page);
          }
        }
      });
    };

    const observer = new IntersectionObserver(intersectionCallback, observerOptions);
    const slides = swiperEl.querySelectorAll(`.${styles.slide}`);
    slides.forEach((slide) => observer.observe(slide));

    return () => {
      slides.forEach((slide) => observer.unobserve(slide));
    };
  }, [videos, page, hasMore, loading, fetchVideos]);

  const handleMuteToggle = () => {
    setGloballyMuted((m) => !m);
  };

  // Programmatic slide scrolling handler
  const scrollToIndex = (index: number) => {
    if (!swiperRef.current) return;
    const slides = swiperRef.current.querySelectorAll(`.${styles.slide}`);
    if (slides && slides[index]) {
      slides[index].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Drawer handlers
  const handleOpenComments = (postId: string) => {
    setCommentingPostId(postId);
  };

  const handleOpenOptionsMenu = (index: number) => {
    setShowOptionsMenuIndex(index);
  };

  const handleOpenProductSheet = (product: any, shopName: string, shopCity: string) => {
    if (product?.id) {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "product_click",
          target_product_id: product.id,
          target_user_id: product.seller_id,
        }),
      }).catch((err) => console.warn(err));
    }

    setActiveProduct(product);
    setProductShopName(shopName);
    setProductShopCity(shopCity);
  };

  // Options Menu Action Handlers
  const handleBlockUser = async (username: string) => {
    if (!confirm(`Are you sure you want to block @${username}?`)) return;
    try {
      const res = await fetch(`/api/users/${username}/block`, { method: "POST" });
      if (res.ok) {
        showToast(`Blocked @${username}`);
        setVideos((prev) => prev.filter((v) => v.user.username !== username));
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to block user");
      }
    } catch (err) {
      console.error(err);
      showToast("Error blocking user");
    } finally {
      setShowOptionsMenuIndex(null);
    }
  };

  const handleMuteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to mute @${username}?`)) return;
    try {
      const res = await fetch(`/api/users/${username}/mute`, { method: "POST" });
      if (res.ok) {
        showToast(`Muted @${username}`);
        setVideos((prev) => prev.filter((v) => v.user.username !== username));
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to mute user");
      }
    } catch (err) {
      console.error(err);
      showToast("Error muting user");
    } finally {
      setShowOptionsMenuIndex(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Post deleted successfully");
        setVideos((prev) => prev.filter((v) => v.id !== postId));
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || "Failed to delete post");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting post");
    } finally {
      setShowOptionsMenuIndex(null);
    }
  };

  const handleOpenReportPost = (postId: string) => {
    setReportTarget("post");
    setReportTargetId(postId);
    setReportTargetLabel("this post");
    setShowOptionsMenuIndex(null);
    setShowReportModal(true);
  };

  const handleOpenReportUser = (username: string) => {
    setReportTarget("user");
    setReportTargetId(username);
    setReportTargetLabel(`@${username}`);
    setShowOptionsMenuIndex(null);
    setShowReportModal(true);
  };

  const currentVideo = showOptionsMenuIndex !== null ? videos[showOptionsMenuIndex] : null;

  return (
    <div className={styles.container} id="quicklook-feed">
      {videos.length === 0 && loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading QuickLook Feed...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚡</div>
          <h2 className="text-heading">QuickLook</h2>
          <p className="text-caption">
            Short-form videos from local sellers. Swipe to discover fashion, cosmetics, and lifestyle
            products.
          </p>
        </div>
      ) : (
        <div ref={swiperRef} className={styles.swiper}>
          {videos.map((video, index) => (
            <div key={video.id} data-index={index} className={styles.slide}>
              <QuickLookVideoPlayer
                video={video}
                isActive={index === activeVideoIndex}
                globallyMuted={globallyMuted}
                onMuteToggle={handleMuteToggle}
                onOpenComments={handleOpenComments}
                onOpenOptionsMenu={handleOpenOptionsMenu}
                onOpenProductSheet={handleOpenProductSheet}
                currentUserId={authUser?.id}
                slideIndex={index}
                onPrev={index > 0 ? () => scrollToIndex(index - 1) : undefined}
                onNext={index < videos.length - 1 ? () => scrollToIndex(index + 1) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Options Overlay Menu */}
      <AnimatePresence>
        {showOptionsMenuIndex !== null && currentVideo && (
          <motion.div
            className={styles.optionsOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOptionsMenuIndex(null)}
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
                {authUser?.id === currentVideo.user_id ? (
                  <button
                    className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                    onClick={() => handleDeletePost(currentVideo.id)}
                  >
                    Delete Post
                  </button>
                ) : (
                  <>
                    <button
                      className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                      onClick={() => handleOpenReportPost(currentVideo.id)}
                    >
                      Report Post
                    </button>
                    <button
                      className={`${styles.optionBtn} ${styles.optionBtnDanger}`}
                      onClick={() => handleOpenReportUser(currentVideo.user.username)}
                    >
                      Report User
                    </button>
                    <button
                      className={styles.optionBtn}
                      onClick={() => handleBlockUser(currentVideo.user.username)}
                    >
                      Block @{currentVideo.user.username}
                    </button>
                    <button
                      className={styles.optionBtn}
                      onClick={() => handleMuteUser(currentVideo.user.username)}
                    >
                      Mute @{currentVideo.user.username}
                    </button>
                  </>
                )}
                <button
                  className={`${styles.optionBtn} ${styles.optionBtnCancel}`}
                  onClick={() => setShowOptionsMenuIndex(null)}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Drawer Sheet */}
      {commentingPostId && (
        <CommentSheet
          postId={commentingPostId}
          isOpen={!!commentingPostId}
          onClose={() => setCommentingPostId(null)}
          currentUserId={authUser?.id}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={reportTarget}
        targetId={reportTargetId}
        targetLabel={reportTargetLabel}
        onReportSubmitted={() => showToast("Report submitted successfully!")}
      />

      {/* Product Sheets Modal */}
      {activeProduct && (
        <ProductSheet
          product={activeProduct}
          shopName={productShopName}
          shopCity={productShopCity}
          isOpen={!!activeProduct}
          onClose={() => setActiveProduct(null)}
          onMapOpen={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              productShopName + " " + productShopCity
            )}`;
            window.open(url, "_blank");
          }}
        />
      )}

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
    </div>
  );
}
