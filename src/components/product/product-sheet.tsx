"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Package,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Product, ProductImage } from "@/types";
import styles from "./product-sheet.module.css";

interface ProductSheetProps {
  product: Product & { images: ProductImage[] };
  shopName?: string;
  shopCity?: string;
  isOpen: boolean;
  onClose: () => void;
  onMapOpen?: () => void;
}

export default function ProductSheet({
  product,
  shopName,
  shopCity,
  isOpen,
  onClose,
  onMapOpen,
}: ProductSheetProps) {
  const [currentImage, setCurrentImage] = useState(0);

  const nextImage = () =>
    setCurrentImage((i) => Math.min(i + 1, product.images.length - 1));
  const prevImage = () => setCurrentImage((i) => Math.max(i - 1, 0));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={styles.sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className={styles.handle}>
              <div className={styles.handleBar} />
            </div>

            {/* Close */}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className={styles.content}>
              {/* Product Image */}
              {product.images.length > 0 && (
                <div className={styles.imageSection}>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={product.images[currentImage]?.image_url || ""}
                      alt={product.title}
                      fill
                      className={styles.productImage}
                      sizes="400px"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className={styles.imageNav}>
                      <button onClick={prevImage} disabled={currentImage === 0}>
                        <ChevronLeft size={16} />
                      </button>
                      <span>
                        {currentImage + 1} / {product.images.length}
                      </span>
                      <button
                        onClick={nextImage}
                        disabled={currentImage === product.images.length - 1}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Product Info */}
              <div className={styles.info}>
                <h2 className={styles.title}>{product.title}</h2>
                <p className={styles.price}>
                  ₹{product.price.toLocaleString()}
                </p>

                {product.description && (
                  <p className={styles.description}>{product.description}</p>
                )}

                {/* Sizes */}
                {product.sizes.length > 0 && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Sizes</h3>
                    <div className={styles.sizeGrid}>
                      {product.sizes.map((size) => (
                        <button key={size} className={styles.sizeChip}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock */}
                <div className={styles.metaRow}>
                  <Package size={14} />
                  <span>
                    {product.stock > 0
                      ? `${product.stock} in stock`
                      : "Out of stock"}
                  </span>
                </div>

                {/* Delivery */}
                {product.delivery_info && (
                  <div className={styles.metaRow}>
                    <Truck size={14} />
                    <span>{product.delivery_info}</span>
                  </div>
                )}

                {/* Seller Info */}
                {shopName && (
                  <div className={styles.sellerSection}>
                    <div className={styles.sellerInfo}>
                      <span className={styles.sellerName}>{shopName}</span>
                      {shopCity && (
                        <span className={styles.sellerCity}>{shopCity}</span>
                      )}
                    </div>
                    {onMapOpen && (
                      <button
                        className={styles.mapBtn}
                        onClick={onMapOpen}
                        id="open-map"
                      >
                        <MapPin size={16} />
                        Directions
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
