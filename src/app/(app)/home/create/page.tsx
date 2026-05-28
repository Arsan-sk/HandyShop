"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./create.module.css";

interface MediaFile {
  file: File;
  url: string;
  type: "image" | "video";
  id: string;
}

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return null;
  }

  const categories = [
    { id: "fashion", name: "👗 Fashion" },
    { id: "electronics", name: "📱 Electronics" },
    { id: "food", name: "🍔 Food" },
    { id: "home", name: "🏠 Home" },
    { id: "beauty", name: "💄 Beauty" },
    { id: "books", name: "📚 Books" },
    { id: "sports", name: "⚽ Sports" },
    { id: "other", name: "🛍️ Other" },
  ];

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setError("Only images and videos are allowed");
        return;
      }

      // Validate file size (max 50MB per file)
      if (file.size > 50 * 1024 * 1024) {
        setError("Each file must be less than 50MB");
        return;
      }

      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("image/") ? "image" : "video";
      const id = Math.random().toString(36).substr(2, 9);

      setMediaFiles((prev) => [...prev, { file, url, type, id }]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const media = prev.find((m) => m.id === id);
      if (media) {
        URL.revokeObjectURL(media.url);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadProgress("");

    // Validation
    if (mediaFiles.length === 0) {
      setError("Please upload at least one image or video");
      return;
    }

    if (!caption.trim()) {
      setError("Please add a caption");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      console.log(`[Create] Preparing ${mediaFiles.length} file(s) for upload...`);
      mediaFiles.forEach((media, idx) => {
        const sizeMB = (media.file.size / 1024 / 1024).toFixed(2);
        formData.append("files", media.file);
        console.log(
          `[Create] File ${idx + 1}/${mediaFiles.length}: ${media.file.name} (${sizeMB}MB)`
        );
      });
      formData.append("caption", caption);
      formData.append("category", category);
      formData.append("userId", user.id);

      const totalSizeMB = mediaFiles.reduce((sum, m) => sum + m.file.size, 0) / 1024 / 1024;
      console.log(`[Create] Total upload size: ${totalSizeMB.toFixed(2)}MB`);
      console.log(`[Create] Starting upload to /api/posts/create...`);
      setUploadProgress(`Uploading ${mediaFiles.length} file(s) (${totalSizeMB.toFixed(2)}MB)...`);

      // Upload media and create post with 120 second timeout (increased from 90 for large files)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error("[Create] Request timeout after 120 seconds");
        controller.abort();
      }, 120000);

      const response = await fetch("/api/posts/create", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Upload failed with status ${response.status}`;
        let detailedErrors: string[] = [];
        
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
          
          // Include detailed error information if available
          if (errorData.errors && Array.isArray(errorData.errors)) {
            detailedErrors = errorData.errors;
            console.error("[Create] Detailed upload errors:", detailedErrors);
          }
          
          if (errorData.details) {
            console.error("[Create] Error details:", errorData.details);
          }
          
          if (errorData.error) {
            console.error("[Create] Server error:", errorData.error);
          }
        } catch (parseErr) {
          console.error("[Create] Could not parse error response");
        }
        
        // Format error message with details
        if (detailedErrors.length > 0) {
          errorMsg += `\n\nFile errors:\n${detailedErrors.join("\n")}`;
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("[Create] Post created successfully!");
      console.log("[Create] Post ID:", data.post?.id);
      console.log("[Create] Media files uploaded:", data.post?.media?.length || 0);
      
      setUploadProgress("✓ Post published! Redirecting...");

      // Small delay before redirect
      setTimeout(() => {
        router.push("/home");
      }, 1000);
    } catch (err) {
      let errorMessage = "Failed to create post";

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage =
            "Upload timeout - files took too long to upload.\n\nTry:\n• Using smaller files\n• Checking your internet connection\n• Uploading fewer files";
        } else {
          errorMessage = err.message;
        }
        console.error("[Create] Error:", err.message);
      } else {
        console.error("[Create] Unknown error", err);
      }

      setError(errorMessage);
      setUploadProgress("");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={() => router.back()}
          className={styles.backButton}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>Create Post</h1>
        <div style={{ width: 24 }} />
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Media Upload Section */}
        <div className={styles.mediaSection}>
          <div className={styles.mediaGrid}>
            {mediaFiles.map((media, index) => (
              <motion.div
                key={media.id}
                className={styles.mediaItem}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div className={styles.mediaPreview}>
                  {media.type === "image" ? (
                    <Image
                      src={media.url}
                      alt="Preview"
                      fill
                      className={styles.preview}
                    />
                  ) : (
                    <video src={media.url} className={styles.preview} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(media.id)}
                  className={styles.removeButton}
                  aria-label="Remove media"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}

            {/* Upload Button */}
            <label className={styles.uploadBox}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className={styles.fileInput}
              />
              <div className={styles.uploadContent}>
                <Upload size={32} />
                <p>Upload Photos/Videos</p>
                <span>Max 50MB per file</span>
              </div>
            </label>
          </div>
        </div>

        {/* Caption Section */}
        <div className={styles.formGroup}>
          <label htmlFor="caption" className={styles.label}>
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your post..."
            className={styles.textarea}
            maxLength={2200}
          />
          <div className={styles.charCount}>
            {caption.length}/2200
          </div>
        </div>

        {/* Category Section */}
        <div className={styles.formGroup}>
          <label htmlFor="category" className={styles.label}>
            Category
          </label>
          <div className={styles.categoryGrid}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryButton} ${
                  category === cat.id ? styles.selected : ""
                }`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            className={styles.errorMessage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <motion.div
            className={styles.progressMessage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className={styles.progressSpinner} />
            {uploadProgress}
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitButton}
        >
          {isSubmitting ? (
            <>
              <span className={styles.spinner} />
              Publishing...
            </>
          ) : (
            "Publish Post"
          )}
        </button>

        {/* Info Note */}
        <p className={styles.infoText}>
          Your post will be visible to all users in your area and to your followers.
        </p>
      </form>
    </div>
  );
}
