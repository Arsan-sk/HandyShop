"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { DisplayWithDetails } from "@/types";
import styles from "./display-viewer.module.css";

interface DisplayViewerProps {
  displays: DisplayWithDetails[];
  initialUserIndex?: number;
  onClose?: () => void;
  currentUserId?: string;
}

interface TextOverlay {
  text: string;
  color: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  fontSize?: string;
}

interface StickerOverlay {
  emoji: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  scale?: number;
}

interface OverlaysData {
  texts: TextOverlay[];
  stickers: StickerOverlay[];
}

// Parse text and sticker overlays from hash parameter in URL
function parseOverlays(mediaUrl: string) {
  try {
    const parts = mediaUrl.split("#");
    const cleanUrl = parts[0];
    if (parts.length > 1) {
      const hash = parts[1];
      if (hash.startsWith("overlays=")) {
        const jsonStr = decodeURIComponent(hash.slice("overlays=".length));
        return { cleanUrl, overlays: JSON.parse(jsonStr) as OverlaysData };
      }
    }
    return { cleanUrl, overlays: null };
  } catch (e) {
    console.error("Failed to parse overlays:", e);
    return { cleanUrl: mediaUrl, overlays: null };
  }
}

export default function DisplayViewer({
  displays,
  initialUserIndex = 0,
  onClose,
  currentUserId,
}: DisplayViewerProps) {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);

  // Viewer list modal state
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Group displays by user
  const userGroups = displays.reduce<Record<string, DisplayWithDetails[]>>(
    (acc, display) => {
      const key = display.user_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(display);
      return acc;
    },
    {}
  );

  const userIds = Object.keys(userGroups);
  const currentUserDisplays = userGroups[userIds[userIndex]] || [];

  // Flatten media items for the active user group, sorted chronologically by display creation
  const userMediaItems = currentUserDisplays
    .flatMap((d) =>
      (d.media || []).map((m) => ({
        ...m,
        displayId: d.id,
        displayOwnerId: d.user_id,
        createdAt: d.created_at,
        displayObject: d,
      }))
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const currentMediaItem = userMediaItems[mediaIndex];
  const currentDisplay = currentMediaItem?.displayObject;
  const currentUser = currentDisplay?.user;

  // Fetch viewers if open and display is owned by user
  const fetchViewers = useCallback(async (displayId: string) => {
    setLoadingViewers(true);
    try {
      const res = await fetch(`/api/displays/${displayId}/viewers`);
      if (res.ok) {
        const data = await res.json();
        setViewers(data.viewers || []);
      }
    } catch (e) {
      console.error("Error fetching story viewers:", e);
    } finally {
      setLoadingViewers(false);
    }
  }, []);

  useEffect(() => {
    if (showViewers && currentDisplay?.id) {
      fetchViewers(currentDisplay.id);
    }
  }, [showViewers, currentDisplay?.id, fetchViewers]);

  // Mark display as viewed
  useEffect(() => {
    if (currentDisplay) {
      fetch(`/api/displays/${currentDisplay.id}/view`, {
        method: "POST",
      }).catch(console.error);
    }
  }, [currentDisplay?.id]);

  const nextStory = useCallback(() => {
    if (mediaIndex < userMediaItems.length - 1) {
      setMediaIndex((prev) => prev + 1);
    } else if (userIndex < userIds.length - 1) {
      setUserIndex((prev) => prev + 1);
      setMediaIndex(0);
    } else {
      onClose?.();
    }
  }, [mediaIndex, userIndex, userMediaItems.length, userIds.length, onClose]);

  const prevStory = useCallback(() => {
    if (mediaIndex > 0) {
      setMediaIndex((prev) => prev - 1);
    } else if (userIndex > 0) {
      setUserIndex((prev) => prev - 1);
      const prevUserDisplays = userGroups[userIds[userIndex - 1]] || [];
      const prevUserMediaCount = prevUserDisplays.flatMap(
        (d) => d.media || []
      ).length;
      setMediaIndex(prevUserMediaCount > 0 ? prevUserMediaCount - 1 : 0);
    }
  }, [mediaIndex, userIndex, userGroups, userIds]);

  // Auto-advance stories
  useEffect(() => {
    if (isPaused || isHolding || showViewers || !currentMediaItem) return;

    const duration = (currentMediaItem.duration_seconds || 5) * 1000;

    autoPlayRef.current = setTimeout(() => {
      nextStory();
    }, duration);

    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [
    mediaIndex,
    userIndex,
    isPaused,
    isHolding,
    showViewers,
    currentMediaItem,
    nextStory,
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") nextStory();
      if (e.key === "ArrowLeft") prevStory();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextStory, prevStory, onClose]);

  if (!currentMediaItem || !currentDisplay || !currentUser) {
    return null;
  }

  const isVideo = currentMediaItem.media_type === "video";
  const { cleanUrl, overlays } = parseOverlays(currentMediaItem.media_url);
  const isOwner = currentUserId && currentUser.id === currentUserId;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Progress Bars */}
        <div className={styles.progressBars}>
          {userMediaItems.map((_, idx) => (
            <div
              key={idx}
              className={`${styles.progressBar} ${
                idx < mediaIndex ? styles.completed : ""
              } ${idx === mediaIndex ? styles.active : ""}`}
              style={{
                animationDuration:
                  idx === mediaIndex && !isPaused && !isHolding && !showViewers
                    ? `${currentMediaItem.duration_seconds || 5}s`
                    : "0s",
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            {currentUser.avatar_url && (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className={styles.avatar}
              />
            )}
            <div className={styles.userDetails}>
              <p className={styles.username}>{currentUser.username}</p>
              <p className={styles.time}>
                {(() => {
                  const created = new Date(currentDisplay.created_at);
                  const now = new Date();
                  const diffMs = now.getTime() - created.getTime();
                  const diffMins = Math.floor(diffMs / 60000);

                  if (diffMins < 1) return "just now";
                  if (diffMins < 60) return `${diffMins}m ago`;
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) return `${diffHours}h ago`;
                  const diffDays = Math.floor(diffHours / 24);
                  return `${diffDays}d ago`;
                })()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Media Container */}
        <div
          className={styles.mediaContainer}
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onMouseLeave={() => setIsHolding(false)}
          onTouchStart={(e) => {
            touchStartRef.current = e.touches[0].clientX;
            setIsHolding(true);
          }}
          onTouchEnd={(e) => {
            setIsHolding(false);
            const diff = touchStartRef.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                nextStory();
              } else {
                prevStory();
              }
            }
          }}
        >
          {isVideo ? (
            <video
              src={cleanUrl}
              className={styles.media}
              autoPlay
              muted
              loop={false}
              onEnded={nextStory}
            />
          ) : (
            <img src={cleanUrl} alt="Story" className={styles.media} />
          )}

          {/* Overlays rendering */}
          {overlays?.texts?.map((t, idx) => (
            <div
              key={`text-overlay-${idx}`}
              className={styles.textOverlay}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                color: t.color || "#ffffff",
                fontSize: t.fontSize || "1.5rem",
              }}
            >
              {t.text}
            </div>
          ))}

          {overlays?.stickers?.map((s, idx) => (
            <div
              key={`sticker-overlay-${idx}`}
              className={styles.stickerOverlay}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%, -50%) scale(${s.scale || 1.5})`,
              }}
            >
              {s.emoji}
            </div>
          ))}

          {/* Click Areas for Navigation */}
          <button
            className={styles.navArea}
            style={{ left: 0 }}
            onClick={prevStory}
            aria-label="Previous story"
          >
            <ChevronLeft size={24} className={styles.navIcon} />
          </button>
          <button
            className={styles.navArea}
            style={{ right: 0 }}
            onClick={nextStory}
            aria-label="Next story"
          >
            <ChevronRight size={24} className={styles.navIcon} />
          </button>
        </div>

        {/* Footer / User Navigation */}
        <div className={styles.userNavigation}>
          <button
            onClick={() => {
              if (userIndex > 0) {
                setUserIndex((prev) => prev - 1);
                setMediaIndex(0);
              }
            }}
            disabled={userIndex === 0}
            className={styles.userNavBtn}
            aria-label="Previous user"
          >
            <ChevronLeft size={20} />
          </button>

          {isOwner ? (
            <button
              onClick={() => {
                setIsPaused(true);
                setShowViewers(true);
              }}
              className={styles.viewersCountBtn}
            >
              <Eye size={16} />
              <span>{currentDisplay.view_count || 0} views</span>
            </button>
          ) : (
            <span className={styles.userCount}>
              {userIndex + 1} / {userIds.length}
            </span>
          )}

          <button
            onClick={() => {
              if (userIndex < userIds.length - 1) {
                setUserIndex((prev) => prev + 1);
                setMediaIndex(0);
              }
            }}
            disabled={userIndex === userIds.length - 1}
            className={styles.userNavBtn}
            aria-label="Next user"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Viewer List Drawer */}
        {showViewers && (
          <div className={styles.viewersDrawer}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <Eye size={18} className="text-secondary" />
                <h3 className="text-body font-bold">Story Views</h3>
              </div>
              <button
                onClick={() => {
                  setShowViewers(false);
                  setIsPaused(false);
                }}
                className={styles.drawerCloseBtn}
                aria-label="Close viewers"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.drawerContent}>
              {loadingViewers ? (
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinnerSmall} />
                  <span>Loading views...</span>
                </div>
              ) : viewers.length === 0 ? (
                <div className={styles.emptyViewers}>
                  <p className="text-caption">No one has viewed this story yet.</p>
                </div>
              ) : (
                <div className={styles.viewersList}>
                  {viewers.map((viewer, idx) => (
                    <div key={idx} className={styles.viewerItem}>
                      {viewer.user?.avatar_url ? (
                        <img
                          src={viewer.user.avatar_url}
                          alt={viewer.user.username}
                          className={styles.viewerAvatar}
                        />
                      ) : (
                        <div className={styles.viewerAvatarFallback}>
                          {viewer.user?.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className={styles.viewerInfo}>
                        <p className={styles.viewerUsername}>
                          {viewer.user?.username}
                        </p>
                        <p className={styles.viewerDisplayName}>
                          {viewer.user?.display_name || viewer.user?.username}
                        </p>
                      </div>
                      <span className={styles.viewTime}>
                        {(() => {
                          const viewed = new Date(viewer.viewed_at);
                          const now = new Date();
                          const diffMs = now.getTime() - viewed.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          if (diffMins < 1) return "now";
                          if (diffMins < 60) return `${diffMins}m`;
                          const diffHours = Math.floor(diffMins / 60);
                          return `${diffHours}h`;
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
