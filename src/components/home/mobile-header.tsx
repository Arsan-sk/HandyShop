"use client";

import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import styles from "./mobile-header.module.css";

export default function MobileHeader() {
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
          <Bell size={24} strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
