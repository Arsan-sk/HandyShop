"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { DisplayWithDetails } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./displays-bar.module.css";

interface DisplaysBarProps {
  displays: DisplayWithDetails[];
  onDisplayClick?: (displayId: string) => void;
  onCreateDisplay?: () => void;
}

export default function DisplaysBar({
  displays,
  onDisplayClick,
  onCreateDisplay,
}: DisplaysBarProps) {
  const { profile, loading } = useAuth();

  // Group displays by user
  const userDisplays = displays.reduce<
    Record<string, DisplayWithDetails[]>
  >((acc, display) => {
    const key = display.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(display);
    return acc;
  }, {});

  const users = Object.entries(userDisplays);

  // Filter out current user's displays from the main feed list
  const otherUsers = profile
    ? users.filter(([userId]) => userId !== profile.id)
    : users;

  const currentUserDisplays = profile ? userDisplays[profile.id] || [] : [];
  const hasDisplays = currentUserDisplays.length > 0;
  const hasUnviewed = currentUserDisplays.some((d) => !d.is_viewed);

  return (
    <section className={styles.container} id="displays-bar">
      <div className={styles.scroll}>
        {/* Unified "Your Display" Component */}
        {loading ? (
          <div className={styles.displayItem}>
            <div className={`${styles.ring} ${styles.ringSkeleton}`}>
              <div className={`${styles.avatarWrapper} ${styles.skeleton}`} />
            </div>
            <span className={styles.label}>Your Display</span>
          </div>
        ) : (
          profile && (
            <div className={styles.itemWrapper}>
              <div className={styles.avatarContainer}>
                <button
                  className={styles.avatarButton}
                  onClick={() => {
                    if (hasDisplays) {
                      onDisplayClick?.(currentUserDisplays[0].id);
                    } else {
                      onCreateDisplay?.();
                    }
                  }}
                  aria-label={hasDisplays ? "View your display" : "Add to your display"}
                >
                  <div
                    className={`${styles.ring} ${
                      hasDisplays
                        ? hasUnviewed
                          ? styles.ringActive
                          : styles.ringViewed
                        : styles.ringNone
                    }`}
                  >
                    <div className={styles.avatarWrapper}>
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Your avatar"
                          className={styles.avatarImg}
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {profile.username[0]?.toUpperCase() || "Y"}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Small Instagram-style add badge */}
                <button
                  className={styles.selfPlusBadge}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateDisplay?.();
                  }}
                  aria-label="Add new display"
                >
                  <Plus size={12} strokeWidth={3} className={styles.plusIconSelf} />
                </button>
              </div>
              <span className={styles.label}>Your Display</span>
            </div>
          )
        )}

        {/* User Displays (excl. current user) */}
        {otherUsers.map(([userId, userDisplayList]) => {
          const display = userDisplayList[0];
          const user = display.user;

          // Skip if user data is missing
          if (!user || !user.username) {
            return null;
          }

          const hasUnviewedOther = userDisplayList.some((d) => !d.is_viewed);

          return (
            <motion.button
              key={userId}
              className={styles.displayItem}
              onClick={() => onDisplayClick?.(display.id)}
              whileTap={{ scale: 0.95 }}
              aria-label={`View ${user.username}'s display`}
            >
              <div
                className={`${styles.ring} ${
                  hasUnviewedOther ? styles.ringActive : styles.ringViewed
                }`}
              >
                <div className={styles.avatarWrapper}>
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {user.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className={styles.label}>{user.username}</span>
            </motion.button>
          );
        })}

        {/* Empty state */}
        {otherUsers.length === 0 && !profile && (
          <div className={styles.emptyHint}>
            <span className="text-micro">Follow sellers to see displays</span>
          </div>
        )}
      </div>
    </section>
  );
}
