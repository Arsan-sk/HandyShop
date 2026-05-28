"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronRight, Check, SkipForward } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./onboarding.module.css";

const CATEGORIES = [
  { id: "clothing", label: "Clothing", emoji: "👗" },
  { id: "cosmetics", label: "Cosmetics", emoji: "💄" },
  { id: "electronics", label: "Electronics", emoji: "📱" },
  { id: "handmade", label: "Handmade", emoji: "🎨" },
  { id: "furniture", label: "Furniture", emoji: "🪑" },
  { id: "accessories", label: "Accessories", emoji: "💎" },
  { id: "wearables", label: "Wearables", emoji: "⌚" },
  { id: "other", label: "Other", emoji: "✨" },
];

type Step = "location" | "interests" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("location");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { user, refreshProfile } = useAuth();

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLocationNext = async () => {
    if (!city.trim()) return;
    setLoading(true);

    if (user) {
      await supabase
        .from("users")
        .update({ city: city.trim(), area: area.trim() })
        .eq("id", user.id);
    }

    setLoading(false);
    setStep("interests");
  };

  const handleInterestsNext = async () => {
    setLoading(true);

    if (user && selectedInterests.length > 0) {
      // Fetch category IDs for selected slugs
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .in("slug", selectedInterests);

      if (categories) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ interests: categories.map((c) => c.id) })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating interests:", updateError);
        }
      }
    }

    await refreshProfile();
    setLoading(false);
    setStep("done");

    // Navigate to home after short delay
    // Use window.location.href for hard navigation to avoid routing loops
    setTimeout(() => {
      window.location.href = "/home";
    }, 1000);
  };

  const handleSkip = () => {
    if (step === "location") {
      setStep("interests");
    } else if (step === "interests") {
      // Skip to home with hard navigation
      window.location.href = "/home";
    }
  };

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div className={styles.progress}>
        <div
          className={styles.progressFill}
          style={{
            width:
              step === "location"
                ? "33%"
                : step === "interests"
                ? "66%"
                : "100%",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Location */}
        {step === "location" && (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className={styles.stepContent}
          >
            <div className={styles.stepHeader}>
              <div className={styles.iconCircle}>
                <MapPin size={28} />
              </div>
              <h1 className="text-display">Where are you?</h1>
              <p className="text-caption">
                Help us find shops and products near you
              </p>
            </div>

            <div className={styles.form}>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={styles.input}
                id="onboarding-city"
                autoFocus
              />
              <input
                type="text"
                placeholder="Area / Neighborhood (optional)"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={styles.input}
                id="onboarding-area"
              />
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleSkip}
                className={styles.skipBtn}
                id="skip-location"
              >
                <SkipForward size={14} /> Skip
              </button>
              <button
                onClick={handleLocationNext}
                disabled={loading || !city.trim()}
                className={styles.nextBtn}
                id="next-location"
              >
                {loading ? (
                  <div className={styles.spinner} />
                ) : (
                  <>
                    Continue <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Interests */}
        {step === "interests" && (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className={styles.stepContent}
          >
            <div className={styles.stepHeader}>
              <h1 className="text-display">What interests you?</h1>
              <p className="text-caption">
                Pick categories to personalize your feed
              </p>
            </div>

            <div className={styles.grid}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedInterests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleInterest(cat.id)}
                    className={`${styles.categoryCard} ${
                      isSelected ? styles.categorySelected : ""
                    }`}
                    id={`category-${cat.id}`}
                  >
                    <span className={styles.categoryEmoji}>{cat.emoji}</span>
                    <span className={styles.categoryLabel}>{cat.label}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={styles.checkMark}
                      >
                        <Check size={14} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleSkip}
                className={styles.skipBtn}
                id="skip-interests"
              >
                <SkipForward size={14} /> Skip
              </button>
              <button
                onClick={handleInterestsNext}
                disabled={loading}
                className={styles.nextBtn}
                id="next-interests"
              >
                {loading ? (
                  <div className={styles.spinner} />
                ) : (
                  <>
                    Let&apos;s Go <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className={styles.doneState}
          >
            <div className={styles.doneIcon}>🎉</div>
            <h1 className="text-display">You&apos;re all set!</h1>
            <p className="text-caption">Discover amazing local shops near you</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
