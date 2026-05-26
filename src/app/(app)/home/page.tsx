"use client";

import { motion } from "framer-motion";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Displays Section */}
      <section className={styles.displays} id="displays-section">
        <div className={styles.displaysScroll}>
          {/* Display avatars will be rendered here */}
          <div className={styles.displayPlaceholder}>
            <div className="display-ring">
              <div className="display-ring__inner">
                <div className={styles.avatarPlaceholder} />
              </div>
            </div>
            <span className={styles.displayLabel}>Your Story</span>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section className={styles.feed} id="home-feed">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.emptyState}
        >
          <div className={styles.emptyIcon}>🛍️</div>
          <h2 className="text-heading">Discover Local Shops</h2>
          <p className="text-caption">
            Follow sellers and explore nearby shops to fill your feed with
            amazing products.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
