"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User, Category } from "@/types";
import styles from "./edit-profile-modal.module.css";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: User | null;
  onSave: () => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: EditProfileModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load categories for interests:", err);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Load existing profile values
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setCity(profile.city || "");
      setArea(profile.area || "");
      setSelectedInterests(profile.interests || []);
      setAvatarPreview(profile.avatar_url || "");
      setAvatarFile(null);
    }
    setError(null);
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("Avatar file is too large (max 5MB)");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const toggleInterest = (categoryId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      let finalAvatarUrl = avatarPreview;

      // 1. Upload Avatar if new file is selected
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${profile.id}/avatar_${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(path, avatarFile, {
            contentType: avatarFile.type,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("profile-images")
          .getPublicUrl(uploadData.path);

        finalAvatarUrl = urlData.publicUrl;
      }

      // 2. Send PUT request to save profile details
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          area: area.trim() || null,
          interests: selectedInterests,
          avatar_url: finalAvatarUrl || null,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to update profile details");
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("[Edit Profile] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.modalTitle}>Edit Profile</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.scrollContent}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* Avatar Upload Container */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarContainer}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {profile.username?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadBtnOverlay}
                  title="Upload avatar"
                >
                  <Upload size={16} />
                </button>
              </div>
              <span className={styles.avatarHint}>Click to change profile picture</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className={styles.hiddenInput}
              />
            </div>

            {/* Display Name */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Display Name</label>
              <input
                type="text"
                placeholder="Your Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={styles.input}
              />
            </div>

            {/* Bio */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Bio</label>
              <textarea
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={styles.textarea}
                rows={3}
              />
            </div>

            {/* City & Area */}
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Area</label>
                <input
                  type="text"
                  placeholder="e.g. Bandra"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Interests Selection */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Select Your Interests</label>
              {categories.length === 0 ? (
                <p className={styles.emptyText}>Loading categories...</p>
              ) : (
                <div className={styles.interestsGrid}>
                  {categories.map((cat) => {
                    const isSelected = selectedInterests.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleInterest(cat.id)}
                        className={`${styles.interestChip} ${
                          isSelected ? styles.chipSelected : ""
                        }`}
                      >
                        <span>{cat.name}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
