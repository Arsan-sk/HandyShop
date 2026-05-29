"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  TrendingUp,
  Zap,
  MessageCircle,
  User,
} from "lucide-react";
import styles from "./bottom-nav.module.css";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/quicklook", label: "QuickLook", icon: Zap },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/chats/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch unread count:", e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll every 10 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 10000);

    // Dynamic event trigger when entering/reading chats
    window.addEventListener("chat-read-update", fetchUnreadCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chat-read-update", fetchUnreadCount);
    };
  }, []);

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.inner}>
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          const showBadge = tab.label === "Chats" && unreadCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              id={`nav-${tab.label.toLowerCase()}`}
              aria-label={tab.label}
              onClick={() => {
                if (pathname === tab.href) {
                  const event = new CustomEvent(`nav-click-${tab.label.toLowerCase()}`);
                  window.dispatchEvent(event);
                }
              }}
            >
              <div className={styles.iconWrapper}>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={styles.icon}
                />
                {showBadge && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
                {isActive && (
                  <motion.div
                    className={styles.indicator}
                    layoutId="nav-indicator"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
              </div>
              <span className={styles.label}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
