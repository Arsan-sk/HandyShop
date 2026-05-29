"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Heart,
  MessageSquare,
  UserPlus,
  Bell,
  X,
  CheckCircle,
} from "lucide-react";
import styles from "./notifications.module.css";

interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  post_id: string | null;
  type: "follow" | "appreciate" | "comment";
  body: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface NotificationPrefs {
  user_id: string;
  follow_notifications: boolean;
  appreciate_notifications: boolean;
  comment_notifications: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "appreciate" | "comment" | "follow">("all");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    }
  }, []);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchNotifications(), fetchPreferences()]).then(() => {
      // Mark all notifications as read upon landing on notifications page
      handleMarkAllRead();
    });
  }, [fetchNotifications, fetchPreferences, handleMarkAllRead]);

  // Save preferences
  const handleSavePreferences = async () => {
    if (!prefs) return;
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
        setShowPrefsModal(false);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Helper: Relative time format
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Filter list
  const filteredNotifications = notifications.filter((notif) => {
    if (filterType === "all") return true;
    return notif.type === filterType;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => router.back()}
            className={styles.iconBtn}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className={styles.title}>Notifications</h1>
        </div>
        <div className={styles.headerActions}>
          {notifications.some((n) => !n.is_read) && (
            <button onClick={handleMarkAllRead} className={styles.markReadBtn}>
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowPrefsModal(true)}
            className={styles.iconBtn}
            aria-label="Preferences"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setFilterType("all")}
          className={`${styles.tab} ${filterType === "all" ? styles.tabActive : ""}`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType("appreciate")}
          className={`${styles.tab} ${
            filterType === "appreciate" ? styles.tabActive : ""
          }`}
        >
          Likes
        </button>
        <button
          onClick={() => setFilterType("comment")}
          className={`${styles.tab} ${
            filterType === "comment" ? styles.tabActive : ""
          }`}
        >
          Comments
        </button>
        <button
          onClick={() => setFilterType("follow")}
          className={`${styles.tab} ${
            filterType === "follow" ? styles.tabActive : ""
          }`}
        >
          Follows
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className={styles.spinner} />
      ) : filteredNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔔</div>
          <h2 className={styles.emptyTitle}>All caught up!</h2>
          <p className={styles.emptyText}>
            No {filterType !== "all" ? `${filterType} ` : ""}notifications found.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const actorFallback = notif.actor.username[0]?.toUpperCase() || "U";
              const detailPath = notif.post_id
                ? `/post/${notif.post_id}`
                : `/profile/${notif.actor.username}`;

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(detailPath)}
                  className={`${styles.item} ${!notif.is_read ? styles.itemUnread : ""}`}
                >
                  {/* Unread blue dot */}
                  {!notif.is_read ? (
                    <div className={styles.unreadDot} />
                  ) : (
                    <div className={styles.unreadDotPlaceholder} />
                  )}

                  {/* Actor Avatar */}
                  <div className={styles.avatarWrapper}>
                    {notif.actor.avatar_url ? (
                      <img
                        src={notif.actor.avatar_url}
                        alt={notif.actor.username}
                        className={styles.avatarImg}
                      />
                    ) : (
                      <div className={styles.avatarFallback}>{actorFallback}</div>
                    )}

                    {/* Badge Overlay */}
                    <div
                      className={`${styles.iconWrapper} ${
                        notif.type === "appreciate"
                          ? styles.iconAppreciate
                          : notif.type === "comment"
                          ? styles.iconComment
                          : styles.iconFollow
                      }`}
                    >
                      {notif.type === "appreciate" && <Heart size={10} fill="currentColor" />}
                      {notif.type === "comment" && <MessageSquare size={10} />}
                      {notif.type === "follow" && <UserPlus size={10} />}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className={styles.contentWrapper}>
                    <p className={styles.messageRow}>
                      <span className={styles.actorName}>
                        {notif.actor.display_name || notif.actor.username}
                      </span>
                      {notif.type === "appreciate" && "appreciated your post."}
                      {notif.type === "comment" && "commented on your post."}
                      {notif.type === "follow" && "started following you."}
                    </p>
                    <span className={styles.time}>{getRelativeTime(notif.created_at)}</span>

                    {notif.type === "comment" && notif.body && (
                      <div className={styles.commentBody}>{notif.body}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPrefsModal && prefs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setShowPrefsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={styles.modal}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Notification Settings</h3>
                <button
                  onClick={() => setShowPrefsModal(false)}
                  className={styles.iconBtn}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Follow Pref */}
                <div className={styles.prefRow}>
                  <div className={styles.prefLabel}>
                    <span className={styles.prefTitle}>Follow Alerts</span>
                    <span className={styles.prefDesc}>Notify when someone follows you</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={prefs.follow_notifications}
                      onChange={(e) =>
                        setPrefs({ ...prefs, follow_notifications: e.target.checked })
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {/* Likes Pref */}
                <div className={styles.prefRow}>
                  <div className={styles.prefLabel}>
                    <span className={styles.prefTitle}>Likes / Appreciates</span>
                    <span className={styles.prefDesc}>Notify when someone likes your post</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={prefs.appreciate_notifications}
                      onChange={(e) =>
                        setPrefs({ ...prefs, appreciate_notifications: e.target.checked })
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {/* Comments Pref */}
                <div className={styles.prefRow}>
                  <div className={styles.prefLabel}>
                    <span className={styles.prefTitle}>Comment Alerts</span>
                    <span className={styles.prefDesc}>Notify when someone comments on your post</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={prefs.comment_notifications}
                      onChange={(e) =>
                        setPrefs({ ...prefs, comment_notifications: e.target.checked })
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className={styles.saveBtn}
                >
                  {savingPrefs ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
