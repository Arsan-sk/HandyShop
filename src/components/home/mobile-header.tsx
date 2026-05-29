"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import styles from "./mobile-header.module.css";

export default function MobileHeader() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications unread count:", e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 15s for mobile
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className={styles.header} id="mobile-header">
      <div className={styles.left}>
        <Link
          href="/home/create"
          className={styles.iconBtn}
          id="create-post-btn"
          aria-label="Create post"
        >
          <Plus size={24} strokeWidth={2} />
        </Link>
      </div>

      <div className={styles.center}>
        <h1 className={styles.title}>HandyShop</h1>
      </div>

      <div className={styles.right}>
        <Link
          href="/home/notifications"
          className={styles.iconBtn}
          id="notifications-btn"
          aria-label="Notifications"
        >
          <div className={styles.iconWrapper}>
            <Bell size={24} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
