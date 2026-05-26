"use client";

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

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.inner}>
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              id={`nav-${tab.label.toLowerCase()}`}
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
