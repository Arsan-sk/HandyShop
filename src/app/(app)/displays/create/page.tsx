"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Play, Type, Smile, Trash2 } from "lucide-react";
import { compressImage, validateVideoRequirements } from "@/lib/media-utils";
import styles from "./create-display.module.css";

interface FilePreview {
  file: File;
  preview: string;
  type: "image" | "video";
}

interface TextOverlay {
  text: string;
  color: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  fontSize?: string;
}

interface StickerOverlay {
  emoji: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  scale?: number;
}

interface OverlaysData {
  texts: TextOverlay[];
  stickers: StickerOverlay[];
}

export default function CreateDisplayPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [fileOverlays, setFileOverlays] = useState<OverlaysData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Editor states
  const [editorTab, setEditorTab] = useState<"text" | "sticker">("text");

  // Text editor inputs
  const [currentText, setCurrentText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);
  const [textSize, setTextSize] = useState(1.5); // rem

  // Sticker editor inputs
  const [selectedEmoji, setSelectedEmoji] = useState("🔥");
  const [emojiX, setEmojiX] = useState(50);
  const [emojiY, setEmojiY] = useState(50);
  const [emojiScale, setEmojiScale] = useState(1.5);

  const emojiPresets = ["🔥", "❤️", "✨", "🏪", "📍", "🛍️", "😂", "🎉", "🙌", "💀", "👍", "👑"];
  const colorPresets = ["#ffffff", "#ff4a4a", "#ffff54", "#54ff54", "#54ffff", "#ff54ff", "#e085ff"];

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      setError(null);
      const newFiles: FilePreview[] = [];
      const newOverlays: OverlaysData[] = [];

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

        const isVideo = file.type.startsWith("video/");
        let processedFile = file;

        if (isVideo) {
          // Validate video requirements
          const validation = await validateVideoRequirements(file, 60);
          if (!validation.valid) {
            setError(validation.error || "Video requirements check failed");
            continue;
          }
        } else {
          // Compress image client side
          processedFile = await compressImage(file);
        }

        // Create preview
        const preview = URL.createObjectURL(processedFile);
        const type = isVideo ? "video" : "image";

        newFiles.push({ file: processedFile, preview, type });
        newOverlays.push({ texts: [], stickers: [] });
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setFileOverlays((prev) => [...prev, ...newOverlays]);
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
    setFileOverlays((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex >= files.length - 1) {
      setSelectedIndex(Math.max(0, files.length - 2));
    }
  };

  // Add overlays
  const addTextOverlay = () => {
    if (!currentText.trim()) return;
    setFileOverlays((prev) => {
      const updated = [...prev];
      if (!updated[selectedIndex]) {
        updated[selectedIndex] = { texts: [], stickers: [] };
      }
      updated[selectedIndex].texts = [
        ...(updated[selectedIndex].texts || []),
        {
          text: currentText,
          color: textColor,
          x: textX,
          y: textY,
          fontSize: `${textSize}rem`,
        },
      ];
      return updated;
    });
    setCurrentText("");
  };

  const removeTextOverlay = (idx: number) => {
    setFileOverlays((prev) => {
      const updated = [...prev];
      if (updated[selectedIndex]) {
        updated[selectedIndex].texts = updated[selectedIndex].texts.filter(
          (_, i) => i !== idx
        );
      }
      return updated;
    });
  };

  const addStickerOverlay = () => {
    setFileOverlays((prev) => {
      const updated = [...prev];
      if (!updated[selectedIndex]) {
        updated[selectedIndex] = { texts: [], stickers: [] };
      }
      updated[selectedIndex].stickers = [
        ...(updated[selectedIndex].stickers || []),
        {
          emoji: selectedEmoji,
          x: emojiX,
          y: emojiY,
          scale: emojiScale,
        },
      ];
      return updated;
    });
  };

  const removeStickerOverlay = (idx: number) => {
    setFileOverlays((prev) => {
      const updated = [...prev];
      if (updated[selectedIndex]) {
        updated[selectedIndex].stickers = updated[selectedIndex].stickers.filter(
          (_, i) => i !== idx
        );
      }
      return updated;
    });
  };

  // Upload display
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one image or video");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append("files", f.file);
      });
      formData.append("source_post_id", "");
      formData.append("overlays", JSON.stringify(fileOverlays));

      setUploadProgress(40);

      const response = await fetch("/api/displays/create", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create display");
      }

      setUploadProgress(100);

      // Clear files
      files.forEach((f) => URL.revokeObjectURL(f.preview));

      // Redirect to home
      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      console.error("Display upload error:", err);
      setUploadProgress(0);
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
        <h1 className={styles.title}>Create Story</h1>
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
          {/* Left Pane - Previews */}
          <div className={styles.leftPane}>
            {/* Main Preview Container */}
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

              {/* Added Overlays Live Preview */}
              {fileOverlays[selectedIndex]?.texts?.map((t, idx) => (
                <div
                  key={`prev-text-${idx}`}
                  className={styles.previewTextOverlay}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    color: t.color,
                    fontSize: t.fontSize || "1.5rem",
                  }}
                >
                  {t.text}
                </div>
              ))}

              {fileOverlays[selectedIndex]?.stickers?.map((s, idx) => (
                <div
                  key={`prev-sticker-${idx}`}
                  className={styles.previewStickerOverlay}
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: `translate(-50%, -50%) scale(${s.scale || 1.5})`,
                    fontSize: "2.5rem",
                  }}
                >
                  {s.emoji}
                </div>
              ))}

              {/* Controls */}
              <div className={styles.controls}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.addBtn}
                  title="Add more files"
                >
                  <Upload size={18} />
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
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Pane - Overlay Editor */}
          <div className={styles.editorPane}>
            <div className={styles.editorTabs}>
              <button
                className={`${styles.tabBtn} ${
                  editorTab === "text" ? styles.active : ""
                }`}
                onClick={() => setEditorTab("text")}
              >
                <Type size={16} />
                <span>Text</span>
              </button>
              <button
                className={`${styles.tabBtn} ${
                  editorTab === "sticker" ? styles.active : ""
                }`}
                onClick={() => setEditorTab("sticker")}
              >
                <Smile size={16} />
                <span>Stickers</span>
              </button>
            </div>

            {/* Text Editor Section */}
            {editorTab === "text" && (
              <div className={styles.editorSection}>
                <h3 className={styles.editorSectionTitle}>Add Text Overlay</h3>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Text Content</label>
                  <input
                    type="text"
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    placeholder="Type overlay text here..."
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Text Color</label>
                  <div className={styles.colorPresets}>
                    {colorPresets.map((c) => (
                      <button
                        key={c}
                        className={`${styles.colorBtn} ${
                          textColor === c ? styles.selected : ""
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setTextColor(c)}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Font Size ({textSize}rem)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={textSize}
                      onChange={(e) => setTextSize(parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Position X ({textX}%)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={textX}
                      onChange={(e) => setTextX(parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Position Y ({textY}%)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={textY}
                      onChange={(e) => setTextY(parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <button onClick={addTextOverlay} className={styles.addOverlayBtn}>
                  Add to Story
                </button>
              </div>
            )}

            {/* Sticker Editor Section */}
            {editorTab === "sticker" && (
              <div className={styles.editorSection}>
                <h3 className={styles.editorSectionTitle}>Add Emoji Sticker</h3>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Select Emoji</label>
                  <div className={styles.emojiGrid}>
                    {emojiPresets.map((emoji) => (
                      <button
                        key={emoji}
                        className={`${styles.emojiBtn} ${
                          selectedEmoji === emoji ? styles.selected : ""
                        }`}
                        onClick={() => setSelectedEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Scale ({emojiScale}x)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={emojiScale}
                      onChange={(e) => setEmojiScale(parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Position X ({emojiX}%)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={emojiX}
                      onChange={(e) => setEmojiX(parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Position Y ({emojiY}%)</label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={emojiY}
                      onChange={(e) => setEmojiY(parseInt(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>

                <button onClick={addStickerOverlay} className={styles.addOverlayBtn}>
                  Add Sticker
                </button>
              </div>
            )}

            {/* Active Overlays List */}
            {((fileOverlays[selectedIndex]?.texts?.length || 0) > 0 ||
              (fileOverlays[selectedIndex]?.stickers?.length || 0) > 0) && (
              <>
                <h4 className={styles.activeOverlaysHeader}>Story Elements</h4>
                <div className={styles.activeOverlaysList}>
                  {fileOverlays[selectedIndex]?.texts?.map((t, idx) => (
                    <div key={`act-txt-${idx}`} className={styles.activeOverlayItem}>
                      <span className={styles.activeOverlayText}>
                        🔤 "{t.text}"
                      </span>
                      <button
                        onClick={() => removeTextOverlay(idx)}
                        className={styles.deleteOverlaySmallBtn}
                        aria-label="Delete text overlay"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {fileOverlays[selectedIndex]?.stickers?.map((s, idx) => (
                    <div key={`act-stk-${idx}`} className={styles.activeOverlayItem}>
                      <span className={styles.activeOverlayText}>
                        ✨ Sticker {s.emoji}
                      </span>
                      <button
                        onClick={() => removeStickerOverlay(idx)}
                        className={styles.deleteOverlaySmallBtn}
                        aria-label="Delete sticker overlay"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Upload Progress & Actions */}
            <div className={styles.uploadInfo}>
              <p className={styles.fileCount}>
                {files.length} file{files.length !== 1 ? "s" : ""} ready
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
                    files.forEach((f) => URL.revokeObjectURL(f.preview));
                    setFiles([]);
                    setFileOverlays([]);
                    setSelectedIndex(0);
                  }}
                  className={styles.cancelBtn}
                  disabled={isUploading}
                >
                  Clear All
                </button>
                <button
                  onClick={handleUpload}
                  className={styles.uploadBtn}
                  disabled={isUploading || files.length === 0}
                >
                  {isUploading ? "Uploading..." : "Share Story"}
                </button>
              </div>
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
    </div>
  );
}
