"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, ShoppingBag } from "lucide-react";
import type { User } from "@/types";
import styles from "./user-card.module.css";

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  const name = user.display_name || user.username;
  const avatarFallback = user.username[0]?.toUpperCase() || "S";

  return (
    <div className={styles.card} id={`user-card-${user.id}`}>
      <Link href={`/profile/${user.username}`} className={styles.link} title={`View ${user.username}'s profile`}>
        <div className={styles.avatarWrapper}>
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.username}
              fill
              sizes="64px"
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>{avatarFallback}</div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.displayName}>{name}</span>
            <span className={styles.username}>@{user.username}</span>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <ShoppingBag size={12} />
              <span>{user.post_count || 0} posts</span>
            </div>
            <div className={styles.stat}>
              <span>{user.follower_count || 0} followers</span>
            </div>
          </div>

          {(user.city || user.area) && (
            <div className={styles.location}>
              <MapPin size={12} />
              <span>
                {[user.area, user.city].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
