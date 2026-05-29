"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./follow-list-modal.module.css";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  type: "followers" | "following";
  onCountChange?: () => void;
}

export default function FollowListModal({
  isOpen,
  onClose,
  username,
  type,
  onCountChange,
}: FollowListModalProps) {
  const router = useRouter();
  const { user: currentUser, refreshProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchList = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/${username}/${type}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(type === "followers" ? data.followers || [] : data.following || []);
        }
      } catch (err) {
        console.error(`Failed to fetch ${type}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [isOpen, username, type]);

  const handleFollowToggle = async (targetUser: any) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (submittingId) return;

    setSubmittingId(targetUser.id);
    try {
      const response = await fetch(`/api/users/${targetUser.username}/follow`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        // Update local items state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, is_following: data.is_following } : u
          )
        );
        // Refresh authenticated user following list count context
        if (refreshProfile) {
          await refreshProfile();
        }
        // Trigger page counter update callback
        onCountChange?.();
      }
    } catch (err) {
      console.error("Follow toggling failed:", err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUserClick = (targetUsername: string) => {
    onClose();
    router.push(`/profile/${targetUsername}`);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{type === "followers" ? "Followers" : "Following"}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.loader}>
              <div className={styles.spinner} />
              <p>Loading list...</p>
            </div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>
              <p>No users found.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {users.map((item) => {
                const avatarFallback = item.username[0]?.toUpperCase() || "U";
                return (
                  <div key={item.id} className={styles.userRow}>
                    <div
                      className={styles.userProfileLink}
                      onClick={() => handleUserClick(item.username)}
                    >
                      <div className={styles.avatar}>
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={item.username} className={styles.avatarImg} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>{avatarFallback}</div>
                        )}
                      </div>
                      <div className={styles.meta}>
                        <span className={styles.displayName}>
                          {item.display_name || item.username}
                        </span>
                        <span className={styles.usernameText}>@{item.username}</span>
                      </div>
                    </div>

                    {!item.is_self && currentUser && (
                      <button
                        onClick={() => handleFollowToggle(item)}
                        disabled={submittingId === item.id}
                        className={`${styles.followBtn} ${
                          item.is_following ? styles.followingActive : ""
                        }`}
                      >
                        {item.is_following ? (
                          <>
                            <UserCheck size={14} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
