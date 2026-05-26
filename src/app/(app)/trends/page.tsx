"use client";

import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import styles from "./trends.module.css";

const filterChips = ["Nearby", "Trending", "Following", "For You"];

export default function TrendsPage() {
  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchWrapper} id="search-section">
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search shops, products, tags..."
            className={styles.searchInput}
            id="search-input"
          />
          <button className={styles.filterBtn} id="filter-button" aria-label="Filters">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className={styles.chips}>
        {filterChips.map((chip, i) => (
          <button
            key={chip}
            className={`${styles.chip} ${i === 0 ? styles.chipActive : ""}`}
            id={`filter-${chip.toLowerCase().replace(" ", "-")}`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Masonry Grid Placeholder */}
      <section className={styles.grid} id="trends-grid">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={styles.emptyState}
        >
          <p className="text-heading">🔍</p>
          <p className="text-caption">
            Discover trending products and hidden local shops
          </p>
        </motion.div>
      </section>
    </div>
  );
}
