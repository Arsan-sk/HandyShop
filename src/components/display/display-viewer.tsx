"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { DisplayWithDetails } from "@/types";
import styles from "./display-viewer.module.css";

interface DisplayViewerProps {
  displays: DisplayWithDetails[];
  initialUserIndex?: number;
  onClose?: () => void;
  currentUserId?: string;
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
  const currentDisplay = currentUserDisplays[mediaIndex];
  const currentUser = currentDisplay?.user;

  // Mark display as viewed
  useEffect(() => {
    if (currentDisplay) {
      fetch(`/api/displays/${currentDisplay.id}/view`, {
        method: "POST",
      }).catch(console.error);
    }
  }, [currentDisplay?.id]);

  // Auto-advance stories
  useEffect(() => {
    if (isPaused || isHolding) return;

    const duration = (currentDisplay?.media[0]?.duration_seconds || 5) * 1000;

    autoPlayRef.current = setTimeout(() => {
      if (mediaIndex < currentDisplay?.media.length - 1) {
        setMediaIndex((prev) => prev + 1);
      } else if (userIndex < userIds.length - 1) {
        setUserIndex((prev) => prev + 1);
        setMediaIndex(0);
      } else {
        onClose?.();
      }
    }, duration);

    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [mediaIndex, userIndex, isPaused, isHolding, currentDisplay, userIds]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") nextStory();
      if (e.key === "ArrowLeft") prevStory();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userIndex, mediaIndex]);

  const nextStory = useCallback(() => {
    if (mediaIndex < currentDisplay?.media.length - 1) {
      setMediaIndex((prev) => prev + 1);
    } else if (userIndex < userIds.length - 1) {
      setUserIndex((prev) => prev + 1);
      setMediaIndex(0);
    } else {
      onClose?.();
    }
  }, [mediaIndex, userIndex, currentDisplay, userIds, onClose]);

  const prevStory = useCallback(() => {
    if (mediaIndex > 0) {
      setMediaIndex((prev) => prev - 1);
    } else if (userIndex > 0) {
      setUserIndex((prev) => prev - 1);
      const prevUserDisplays = userGroups[userIds[userIndex - 1]];
      setMediaIndex(prevUserDisplays?.length - 1 || 0);
    }
  }, [mediaIndex, userIndex, userGroups, userIds]);

  if (!currentDisplay || !currentUser) {
    return null;
  }

  const media = currentDisplay.media[mediaIndex];
  const isVideo = media?.media_type === "video";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Progress Bars */}
        <div className={styles.progressBars}>
          {currentDisplay.media.map((_, idx) => (
            <div
              key={idx}
              className={`${styles.progressBar} ${
                idx < mediaIndex ? styles.completed : ""
              } ${idx === mediaIndex ? styles.active : ""}`}
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
          <button
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close"
          >
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
              src={media.media_url}
              className={styles.media}
              autoPlay
              muted
              loop={false}
              onEnded={nextStory}
            />
          ) : (
            <img
              src={media.media_url}
              alt="Story"
              className={styles.media}
            />
          )}

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

        {/* Navigation Indicators */}
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
          <span className={styles.userCount}>
            {userIndex + 1} / {userIds.length}
          </span>
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
      </div>
    </div>
  );
}
