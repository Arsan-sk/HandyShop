"use client";

import { motion } from "framer-motion";
import {
  Settings,
  Grid3X3,
  ShoppingBag,
  Bookmark,
  BarChart3,
  MapPin,
  Edit3,
} from "lucide-react";
import styles from "./profile.module.css";

export default function ProfilePage() {
  return (
    <div className={styles.container} id="profile-page">
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.username}>username</h1>
        <button className={styles.settingsBtn} id="settings-button" aria-label="Settings">
          <Settings size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Profile Info */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.profileSection}
      >
        {/* Avatar + Stats */}
        <div className={styles.profileTop}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar} />
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>0</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className={styles.bio}>
          <p className={styles.displayName}>Display Name</p>
          <p className={styles.bioText}>Your bio will appear here</p>
          <p className={styles.location}>
            <MapPin size={12} /> City, Area
          </p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.editBtn} id="edit-profile-btn">
            <Edit3 size={14} />
            Edit Profile
          </button>
          <button className={styles.analyticsBtn} id="analytics-btn">
            <BarChart3 size={14} />
            Analytics
          </button>
        </div>
      </motion.section>

      {/* Content Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.tabActive}`} id="tab-posts">
          <Grid3X3 size={20} />
        </button>
        <button className={styles.tab} id="tab-products">
          <ShoppingBag size={20} />
        </button>
        <button className={styles.tab} id="tab-picks">
          <Bookmark size={20} />
        </button>
      </div>

      {/* Tab Content */}
      <section className={styles.tabContent} id="profile-content">
        <div className={styles.emptyGrid}>
          <p className="text-caption">No posts yet</p>
        </div>
      </section>
    </div>
  );
}
