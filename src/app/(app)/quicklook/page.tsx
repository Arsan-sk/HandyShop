"use client";

import { motion } from "framer-motion";
import styles from "./quicklook.module.css";

export default function QuickLookPage() {
  return (
    <div className={styles.container} id="quicklook-feed">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={styles.emptyState}
      >
        <div className={styles.emptyIcon}>⚡</div>
        <h2 className="text-heading">QuickLook</h2>
        <p className="text-caption">
          Short-form videos from local sellers. Swipe to discover fashion,
          cosmetics, and lifestyle products.
        </p>
      </motion.div>
    </div>
  );
}
