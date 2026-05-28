"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductImage } from "@/types";
import ProductSheet from "./product-sheet";
import styles from "./product-card.module.css";

interface ProductCardProps {
  product: Product & { images: ProductImage[]; seller?: { id: string; username: string; display_name: string | null; city: string | null } };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const displayImage = product.images?.[0]?.image_url || "";
  const shopName = product.seller?.display_name || product.seller?.username || "Local Shop";
  const shopCity = product.seller?.city || "";

  return (
    <>
      <div
        className={styles.card}
        onClick={() => setIsSheetOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsSheetOpen(true);
          }
        }}
        id={`product-card-${product.id}`}
      >
        <div className={styles.imageWrapper}>
          {displayImage ? (
            <Image
              src={displayImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholderImg}>🛍️</div>
          )}
          <span className={styles.priceTag}>₹{product.price.toLocaleString()}</span>
        </div>
        <div className={styles.info}>
          <h4 className={styles.title}>{product.title}</h4>
          <div className={styles.shopInfo}>
            <span className={styles.shopName}>{shopName}</span>
            {shopCity && <span className={styles.dot}>•</span>}
            {shopCity && <span className={styles.shopCity}>{shopCity}</span>}
          </div>
        </div>
      </div>

      <ProductSheet
        product={product}
        shopName={shopName}
        shopCity={shopCity}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onMapOpen={() => {
          // External map redirect
          if (product.seller) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName + " " + (shopCity || ""))}`;
            window.open(url, "_blank");
          }
        }}
      />
    </>
  );
}
