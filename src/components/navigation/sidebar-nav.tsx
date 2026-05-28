"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Home,
  TrendingUp,
  Zap,
  MessageCircle,
  User,
  Bell,
} from "lucide-react";

import styles from "./sidebar-nav.module.css";

const tabs = [
  { href: "/home/create", label: "Post", icon: Plus },
  { href: "/home", label: "Home", icon: Home },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/quicklook", label: "QuickLook", icon: Zap },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/home/notifications", label: "Notifications", icon: Bell },
];

export default function SidebarNav() {
  const pathname = usePathname();

  // Sort tabs by href length descending to match the most specific path first
  const sortedTabs = [...tabs].sort((a, b) => b.href.length - a.href.length);
  const activeTab = sortedTabs.find(
    (tab) => pathname === tab.href || pathname.startsWith(tab.href + "/")
  );

  return (
    <aside className={styles.sidebar} id="desktop-sidebar">
      <div className={styles.logoContainer}>
        <Link href="/home" className={styles.logoLink} title="HandyShop" id="sidebar-logo">
          <span className={styles.logoText}>H</span>
        </Link>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {tabs.map((tab) => {
            const isActive = activeTab?.href === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.tab} ${
                  isActive ? styles.active : ""
                }`}
                aria-label={tab.label}
              >
                <div className={styles.iconWrapper}>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={styles.icon}
                  />

                  {isActive && (
                    <motion.div
                      className={styles.indicator}
                      layoutId="sidebar-nav-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                </div>
                <span className={styles.tooltip}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}