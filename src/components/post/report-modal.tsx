"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import styles from "./report-modal.module.css";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "post" | "user";
  targetId: string; // post ID (UUID) or username string
  targetLabel: string; // e.g. "@seller" or "this post"
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "fake_products", label: "Fake products or listings" },
  { value: "inappropriate_media", label: "Inappropriate or graphic media" },
  { value: "shop_not_exist", label: "Shop does not exist at location" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "scam", label: "Scam or fraud attempt" },
  { value: "other", label: "Other issue" },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError("Please select a reason for reporting");
      return;
    }

    setLoading(true);
    setError(null);

    const apiPath =
      targetType === "post"
        ? `/api/posts/${targetId}/report`
        : `/api/users/${targetId}/report`;

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedReason,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit report");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedReason("");
        setDescription("");
        onReportSubmitted?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("[ReportModal] Submit error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.header}>
              <div>
                <h3 className={styles.title}>Report {targetType === "user" ? "User" : "Post"}</h3>
                <p className={styles.subtitle}>Reporting {targetLabel}</p>
              </div>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className={styles.successContainer}>
                <div className={styles.successIcon}>✓</div>
                <h4 className={styles.successTitle}>Thank you</h4>
                <p className={styles.successText}>
                  Your report has been submitted. Our moderation team will review it shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                {error && (
                  <div className={styles.errorBanner}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Reason Selection */}
                <div className={styles.reasonsGroup}>
                  <label className={styles.label}>Select a Reason</label>
                  <div className={styles.reasonsList}>
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`${styles.reasonItem} ${
                          selectedReason === reason.value ? styles.reasonItemActive : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="report_reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={() => setSelectedReason(reason.value)}
                          className={styles.radioInput}
                        />
                        <span className={styles.radioCustom}></span>
                        <span className={styles.reasonLabel}>{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description Textarea */}
                <div className={styles.descriptionGroup}>
                  <label htmlFor="report-desc" className={styles.label}>
                    Details (optional)
                  </label>
                  <textarea
                    id="report-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.substring(0, 300))}
                    placeholder="Provide additional details to help us investigate..."
                    className={styles.textarea}
                    rows={3}
                  />
                  <div className={styles.charCount}>
                    {description.length}/300
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? <div className={styles.spinner} /> : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
