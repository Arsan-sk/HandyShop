"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, UserPlus, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./suggested-users.module.css";

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  city: string | null;
  area: string | null;
  follower_count: number;
}

interface SuggestedUsersProps {
  suggestions: SuggestedUser[];
  loading: boolean;
  mode: "sidebar" | "carousel";
  onFollowToggle?: (userId: string, isFollowing: boolean) => void;
}

export default function SuggestedUsers({
  suggestions,
  loading,
  mode,
  onFollowToggle,
}: SuggestedUsersProps) {
  const router = useRouter();
  const { user: currentUser, refreshProfile } = useAuth();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const handleFollowToggle = async (targetUser: SuggestedUser) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (submittingId) return;

    setSubmittingId(targetUser.id);
    const isFollowing = followedIds.includes(targetUser.id);

    try {
      const response = await fetch(`/api/users/${targetUser.username}/follow`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        
        if (data.is_following) {
          setFollowedIds((prev) => [...prev, targetUser.id]);
        } else {
          setFollowedIds((prev) => prev.filter((id) => id !== targetUser.id));
        }

        // Notify parent
        onFollowToggle?.(targetUser.id, data.is_following);

        // Refresh auth profile to sync follow counts
        if (refreshProfile) {
          await refreshProfile();
        }
      }
    } catch (err) {
      console.error("Follow suggestion toggle failed:", err);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className={`${styles.container} ${styles[mode]} ${styles.loading}`}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Finding suggestions...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  if (mode === "sidebar") {
    return (
      <div className={`${styles.container} ${styles.sidebar}`}>
        <div className={styles.header}>
          <span className={styles.title}>Suggested for You</span>
          <Link href="/trends" className={styles.seeAll}>
            Explore
          </Link>
        </div>

        <div className={styles.list}>
          {suggestions.map((cand) => {
            const isFollowing = followedIds.includes(cand.id);
            const avatarFallback = cand.username[0]?.toUpperCase() || "U";
            return (
              <div key={cand.id} className={styles.row}>
                <Link href={`/profile/${cand.username}`} className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {cand.avatar_url ? (
                      <img
                        src={cand.avatar_url}
                        alt={cand.username}
                        className={styles.avatarImg}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>{avatarFallback}</div>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.usernameRow}>
                      <span className={styles.username}>@{cand.username}</span>
                      {cand.role === "seller" && (
                        <span className={styles.sellerBadge} title="Verified Seller">
                          Shop
                        </span>
                      )}
                    </div>
                    <span className={styles.displayName}>
                      {cand.display_name || cand.username}
                    </span>
                    {cand.city && (
                      <span className={styles.location}>
                        <MapPin size={10} />
                        {cand.city}
                      </span>
                    )}
                  </div>
                </Link>

                <button
                  onClick={() => handleFollowToggle(cand)}
                  disabled={submittingId === cand.id}
                  className={`${styles.followBtn} ${
                    isFollowing ? styles.followingActive : ""
                  }`}
                >
                  {isFollowing ? (
                    <UserCheck size={14} />
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile/Tablet horizontal carousel
  return (
    <div className={`${styles.container} ${styles.carousel}`}>
      <div className={styles.headerInline}>
        <div className={styles.headerTitleInline}>
          <Sparkles size={16} className={styles.sparkleIcon} />
          <span>Suggested Sellers near you</span>
        </div>
        <Link href="/trends" className={styles.seeAllInline}>
          See all
        </Link>
      </div>

      <div className={styles.carouselTrack}>
        {suggestions.map((cand) => {
          const isFollowing = followedIds.includes(cand.id);
          const avatarFallback = cand.username[0]?.toUpperCase() || "U";
          return (
            <div key={cand.id} className={styles.card}>
              <Link href={`/profile/${cand.username}`} className={styles.cardInfo}>
                <div className={styles.cardAvatar}>
                  {cand.avatar_url ? (
                    <img
                      src={cand.avatar_url}
                      alt={cand.username}
                      className={styles.cardAvatarImg}
                    />
                  ) : (
                    <div className={styles.cardAvatarPlaceholder}>{avatarFallback}</div>
                  )}
                </div>
                <span className={styles.cardUsername}>@{cand.username}</span>
                <span className={styles.cardDisplayName}>
                  {cand.display_name || cand.username}
                </span>
                {cand.city && (
                  <span className={styles.cardLocation}>
                    <MapPin size={10} />
                    {cand.city}
                  </span>
                )}
              </Link>

              <button
                onClick={() => handleFollowToggle(cand)}
                disabled={submittingId === cand.id}
                className={`${styles.cardFollowBtn} ${
                  isFollowing ? styles.cardFollowingActive : ""
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
