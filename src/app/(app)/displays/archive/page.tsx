"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import DisplayViewer from "@/components/display/display-viewer";
import { DisplayWithDetails } from "@/types";
import styles from "./archive.module.css";

export default function DisplaysArchivePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [displays, setDisplays] = useState<DisplayWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDisplayId, setViewingDisplayId] = useState<string | null>(null);

  const fetchArchive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/displays/archive");
      if (res.ok) {
        const data = await res.json();
        setDisplays(data.displays || []);
      }
    } catch (e) {
      console.error("Error loading display archive:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  // Strip overlay hash for thumbnail previews
  const getCleanThumbnailUrl = (mediaUrl: string) => {
    return mediaUrl.split("#")[0];
  };

  const getInitialUserIndex = () => {
    if (!viewingDisplayId || displays.length === 0) return 0;
    const selectedDisplay = displays.find((d) => d.id === viewingDisplayId);
    if (!selectedDisplay) return 0;

    const userGroups = displays.reduce<Record<string, DisplayWithDetails[]>>(
      (acc, display) => {
        const key = display.user_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(display);
        return acc;
      },
      {}
    );
    const userIds = Object.keys(userGroups);
    const index = userIds.indexOf(selectedDisplay.user_id);
    return index >= 0 ? index : 0;
  };

  return (
    <div className={styles.container} id="displays-archive-page">
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={() => router.back()}
          className={styles.backBtn}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Story Archive</h1>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className="text-caption">Loading archive...</p>
        </div>
      ) : displays.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📂</div>
          <h2 className={styles.emptyTitle}>Your Archive is Empty</h2>
          <p className={styles.emptyText}>
            Expired stories will automatically appear here after 24 hours so you can rewatch them.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {displays.map((display) => {
            const firstMedia = display.media?.[0];
            if (!firstMedia) return null;

            const isVideo = firstMedia.media_type === "video";
            const thumbUrl = getCleanThumbnailUrl(firstMedia.media_url);

            return (
              <div
                key={display.id}
                className={styles.gridItem}
                onClick={() => setViewingDisplayId(display.id)}
              >
                {isVideo ? (
                  <video src={thumbUrl} className={styles.media} muted playsInline />
                ) : (
                  <img
                    src={thumbUrl}
                    alt="Archived story thumbnail"
                    className={styles.media}
                  />
                )}
                <div className={styles.itemOverlay}>
                  <p className={styles.dateText}>
                    {new Date(display.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className={styles.viewsCount}>
                    <Eye size={12} />
                    <span>{display.view_count || 0}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Story Viewer Modal for Archive */}
      {viewingDisplayId && (
        <DisplayViewer
          displays={displays}
          initialUserIndex={getInitialUserIndex()}
          onClose={() => setViewingDisplayId(null)}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
