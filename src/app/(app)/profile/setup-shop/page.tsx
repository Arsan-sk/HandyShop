"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  MapPin,
  Tag,
  ChevronRight,
  Check,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./setup-shop.module.css";

const CATEGORIES = [
  { slug: "clothing", label: "Clothing", emoji: "👗" },
  { slug: "cosmetics", label: "Cosmetics", emoji: "💄" },
  { slug: "electronics", label: "Electronics", emoji: "📱" },
  { slug: "handmade", label: "Handmade", emoji: "🎨" },
  { slug: "furniture", label: "Furniture", emoji: "🪑" },
  { slug: "accessories", label: "Accessories", emoji: "💎" },
  { slug: "wearables", label: "Wearables", emoji: "⌚" },
  { slug: "other", label: "Other", emoji: "✨" },
];

type Step = "info" | "category" | "location" | "done";

export default function SetupShopPage() {
  const [step, setStep] = useState<Step>("info");
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [shopArea, setShopArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { user, refreshProfile } = useAuth();

  const handleInfoNext = () => {
    if (!shopName.trim()) {
      setError("Shop name is required");
      return;
    }
    setError(null);
    setStep("category");
  };

  const handleCategoryNext = () => {
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }
    setError(null);
    setStep("location");
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) throw new Error("Not authenticated");

      // Get category ID
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", selectedCategory)
        .single();

      // Create seller profile
      const { error: sellerError } = await supabase
        .from("seller_profiles")
        .insert({
          user_id: user.id,
          shop_name: shopName.trim(),
          shop_description: shopDescription.trim() || null,
          category_id: category?.id || null,
          shop_city: shopCity.trim() || null,
          shop_area: shopArea.trim() || null,
        });

      if (sellerError) throw sellerError;

      // Update user role to seller
      const { error: roleError } = await supabase
        .from("users")
        .update({ role: "seller" })
        .eq("id", user.id);

      if (roleError) throw roleError;

      await refreshProfile();
      setStep("done");

      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "category") setStep("info");
    else if (step === "location") setStep("category");
  };

  const stepNumber = step === "info" ? 1 : step === "category" ? 2 : step === "location" ? 3 : 3;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {step !== "info" && step !== "done" && (
          <button onClick={goBack} className={styles.backBtn}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-heading">Setup Your Shop</h1>
        <span className={styles.stepCount}>
          {step !== "done" ? `${stepNumber}/3` : ""}
        </span>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <div
          className={styles.progressFill}
          style={{ width: `${(stepNumber / 3) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Shop Info */}
        {step === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={styles.stepContent}
          >
            <div className={styles.stepIcon}>
              <Store size={28} />
            </div>
            <h2 className="text-display">Tell us about your shop</h2>

            <div className={styles.form}>
              <input
                type="text"
                placeholder="Shop Name *"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={styles.input}
                id="shop-name"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                className={styles.textarea}
                id="shop-description"
                rows={3}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button onClick={handleInfoNext} className={styles.nextBtn}>
              Continue <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Step 2: Category */}
        {step === "category" && (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={styles.stepContent}
          >
            <div className={styles.stepIcon}>
              <Tag size={28} />
            </div>
            <h2 className="text-display">What do you sell?</h2>

            <div className={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`${styles.categoryCard} ${
                    selectedCategory === cat.slug ? styles.categorySelected : ""
                  }`}
                >
                  <span className={styles.categoryEmoji}>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  {selectedCategory === cat.slug && (
                    <Check size={16} className={styles.checkIcon} />
                  )}
                </button>
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button onClick={handleCategoryNext} className={styles.nextBtn}>
              Continue <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Step 3: Location */}
        {step === "location" && (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={styles.stepContent}
          >
            <div className={styles.stepIcon}>
              <MapPin size={28} />
            </div>
            <h2 className="text-display">Where&apos;s your shop?</h2>

            <div className={styles.form}>
              <input
                type="text"
                placeholder="City"
                value={shopCity}
                onChange={(e) => setShopCity(e.target.value)}
                className={styles.input}
                id="shop-city"
              />
              <input
                type="text"
                placeholder="Area / Neighborhood"
                value={shopArea}
                onChange={(e) => setShopArea(e.target.value)}
                className={styles.input}
                id="shop-area"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              onClick={handleComplete}
              disabled={loading}
              className={styles.nextBtn}
            >
              {loading ? (
                <div className={styles.spinner} />
              ) : (
                <>
                  Start Selling <ChevronRight size={16} />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Done */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
            className={styles.doneState}
          >
            <div className={styles.doneIcon}>🎉</div>
            <h2 className="text-display">You&apos;re a seller now!</h2>
            <p className="text-caption">
              Start adding products and posting to grow your shop
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
