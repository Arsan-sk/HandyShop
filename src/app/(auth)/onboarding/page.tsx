"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronRight, Check, SkipForward, UserPlus, UserCheck } from "lucide-react";
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

type Step = "location" | "interests" | "suggestions" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("location");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Suggestions states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [followedSuggestionIds, setFollowedSuggestionIds] = useState<string[]>([]);

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
    setStep("suggestions");
  };

  const handleSuggestionFollowToggle = async (cand: any) => {
    try {
      const response = await fetch(`/api/users/${cand.username}/follow`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.is_following) {
          setFollowedSuggestionIds((prev) => [...prev, cand.id]);
        } else {
          setFollowedSuggestionIds((prev) => prev.filter((id) => id !== cand.id));
        }
      }
    } catch (err) {
      console.error("Failed to follow suggested seller:", err);
    }
  };

  const handleSuggestionsNext = async () => {
    setLoading(true);
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
      setStep("suggestions");
    } else if (step === "suggestions") {
      handleSuggestionsNext();
    }
  };

  // Fetch suggestions when onboarding reaches suggestions step
  useEffect(() => {
    if (step === "suggestions") {
      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
          const res = await fetch("/api/users/suggestions");
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions || []);
          }
        } catch (err) {
          console.error("Failed to load onboarding suggestions:", err);
        } finally {
          setLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    }
  }, [step]);

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div className={styles.progress}>
        <div
          className={styles.progressFill}
          style={{
            width:
              step === "location"
                ? "25%"
                : step === "interests"
                ? "50%"
                : step === "suggestions"
                ? "75%"
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
                    Continue <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Suggestions */}
        {step === "suggestions" && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className={styles.stepContent}
          >
            <div className={styles.stepHeader}>
              <h1 className="text-display">Follow popular shops</h1>
              <p className="text-caption">
                Follow nearby sellers to see what they are listing
              </p>
            </div>

            <div className={styles.suggestionsList}>
              {loadingSuggestions ? (
                <div className={styles.loader}>
                  <div className={styles.spinner} />
                  <p>Finding recommended sellers...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className={styles.empty}>
                  <p>No suggestions available in your area yet.</p>
                </div>
              ) : (
                <div className={styles.list}>
                  {suggestions.map((cand) => {
                    const isFollowing = followedSuggestionIds.includes(cand.id);
                    const avatarFallback = cand.username[0]?.toUpperCase() || "U";
                    return (
                      <div key={cand.id} className={styles.candRow}>
                        <div className={styles.candInfo}>
                          <div className={styles.candAvatar}>
                            {cand.avatar_url ? (
                              <img
                                src={cand.avatar_url}
                                alt={cand.username}
                                className={styles.candAvatarImg}
                              />
                            ) : (
                              <div className={styles.candAvatarPlaceholder}>
                                {avatarFallback}
                              </div>
                            )}
                          </div>
                          <div className={styles.candMeta}>
                            <div className={styles.usernameRow}>
                              <span className={styles.candDisplayName}>
                                {cand.display_name || cand.username}
                              </span>
                              {cand.role === "seller" && (
                                <span className={styles.sellerBadge} title="Verified Seller">
                                  Shop
                                </span>
                              )}
                            </div>
                            <span className={styles.candUsername}>@{cand.username}</span>
                            {cand.city && (
                              <span className={styles.candLocation}>
                                <MapPin size={10} style={{ marginRight: 2 }} />
                                {cand.city} {cand.area ? `, ${cand.area}` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleSuggestionFollowToggle(cand)}
                          className={`${styles.candFollowBtn} ${
                            isFollowing ? styles.candFollowingActive : ""
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck size={14} />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleSkip}
                className={styles.skipBtn}
                id="skip-suggestions"
              >
                <SkipForward size={14} /> Skip
              </button>
              <button
                onClick={handleSuggestionsNext}
                disabled={loading}
                className={styles.nextBtn}
                id="finish-onboarding"
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

        {/* Step 4: Done */}
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
