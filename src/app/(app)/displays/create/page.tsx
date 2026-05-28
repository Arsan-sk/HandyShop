"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Play } from "lucide-react";
import styles from "./create-display.module.css";

interface FilePreview {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function CreateDisplayPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      setError(null);
      const newFiles: FilePreview[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Validate file
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "video/quicktime",
        ];
        if (!validTypes.includes(file.type)) {
          setError(
            `Invalid file type: ${file.type}. Only images and videos allowed.`
          );
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          setError(`File ${file.name} is too large (max 50MB)`);
          continue;
        }

        // Create preview
        const preview = URL.createObjectURL(file);
        const type = file.type.startsWith("video/") ? "video" : "image";

        newFiles.push({ file, preview, type });
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    []
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // Remove file
  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return newFiles;
    });
    if (selectedIndex >= files.length - 1) {
      setSelectedIndex(Math.max(0, files.length - 2));
    }
  };

  // Upload display
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one image or video");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append("files", f.file);
      });
      formData.append("source_post_id", "");

      const response = await fetch("/api/displays/create", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create display");
      }

      // Clear files
      files.forEach((f) => URL.revokeObjectURL(f.preview));

      // Redirect to home
      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      console.error("Display upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={() => router.back()}
          className={styles.closeBtn}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <h1 className={styles.title}>Create Display</h1>
        <div className={styles.placeholder} />
      </div>

      {/* Upload Area */}
      {files.length === 0 ? (
        <div
          className={styles.uploadArea}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add(styles.dragOver);
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove(styles.dragOver);
          }}
        >
          <Upload size={48} className={styles.uploadIcon} />
          <h2 className={styles.uploadTitle}>Add Photos or Videos</h2>
          <p className={styles.uploadText}>
            Drag and drop here or click to select
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={styles.selectBtn}
            disabled={isUploading}
          >
            Select Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/quicktime"
            onChange={(e) => handleFileSelect(e.target.files)}
            className={styles.fileInput}
          />
        </div>
      ) : (
        <div className={styles.previewContainer}>
          {/* Main Preview */}
          <div className={styles.mainPreview}>
            {files[selectedIndex].type === "video" ? (
              <div className={styles.videoWrapper}>
                <video
                  src={files[selectedIndex].preview}
                  className={styles.video}
                  controls
                />
                <div className={styles.videoOverlay}>
                  <Play size={32} />
                </div>
              </div>
            ) : (
              <img
                src={files[selectedIndex].preview}
                alt="Preview"
                className={styles.image}
              />
            )}

            {/* Controls */}
            <div className={styles.controls}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.addBtn}
                title="Add more files"
              >
                <Upload size={20} />
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          {files.length > 1 && (
            <div className={styles.thumbnails}>
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`${styles.thumbnail} ${
                    index === selectedIndex ? styles.active : ""
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {file.type === "video" ? (
                    <>
                      <video src={file.preview} className={styles.thumbVideo} />
                      <div className={styles.playIcon}>
                        <Play size={12} />
                      </div>
                    </>
                  ) : (
                    <img src={file.preview} alt="Thumbnail" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className={styles.removeBtn}
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Info */}
          <div className={styles.uploadInfo}>
            <p className={styles.fileCount}>
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>

            {error && <div className={styles.error}>{error}</div>}

            {isUploading && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progress}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <div className={styles.actions}>
              <button
                onClick={() => {
                  setFiles([]);
                  setSelectedIndex(0);
                }}
                className={styles.cancelBtn}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className={styles.uploadBtn}
                disabled={isUploading || files.length === 0}
              >
                {isUploading ? `Uploading... ${uploadProgress}%` : "Share Story"}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/quicktime"
        onChange={(e) => handleFileSelect(e.target.files)}
        className={styles.fileInput}
      />

      {/* Error Display */}
      {error && !files.length && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className={styles.closeBannerBtn}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
