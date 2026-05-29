"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Trash2,
  UserX,
  FileText,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import styles from "./admin.module.css";

interface Reporter {
  id: string;
  username: string;
  display_name: string | null;
}

interface ReportedUser {
  id: string;
  username: string;
  display_name: string | null;
  is_suspended: boolean;
}

interface ReportedPost {
  id: string;
  caption: string | null;
  status: string;
  user: {
    id: string;
    username: string;
  };
}

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: "pending" | "resolved" | "dismissed";
  reviewed_at: string | null;
  created_at: string;
  reporter: Reporter;
  reported_user: ReportedUser | null;
  reported_post: ReportedPost | null;
}

export default function AdminDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved" | "dismissed">("pending");
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) {
        if (res.status === 403) {
          setError("Forbidden: Access Denied");
          return;
        }
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!profile || profile.role !== "admin") {
      router.push("/home");
      return;
    }

    fetchReports();
  }, [profile, authLoading]);

  const handleAction = async (reportId: string, action: string, reasonText = "") => {
    setActionLoadingId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reason: reasonText || `Admin executed ${action}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to execute action ${action}`);
      }

      showToast(`Action executed: ${action.replace("_", " ")}`);
      // Refresh reports list
      await fetchReports();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || (profile && profile.role !== "admin" && !error)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} className={styles.errorIcon} />
        <h2>{error}</h2>
        <p>You must be an administrator to access this page.</p>
        <Link href="/home" className={styles.backBtn}>
          Back to Home
        </Link>
      </div>
    );
  }

  const filteredReports = reports.filter((r) => r.status === activeTab);

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  const getReasonLabel = (reason: string) => {
    const mapping: Record<string, string> = {
      spam: "Spam",
      fake_products: "Fake Listing",
      inappropriate_media: "Inappropriate Content",
      shop_not_exist: "Fake Location",
      harassment: "Harassment",
      scam: "Scam / Fraud",
      other: "Other",
    };
    return mapping[reason] || reason;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Shield className={styles.shieldIcon} size={28} />
          <div>
            <h1 className={styles.title}>Safety & Moderation</h1>
            <p className={styles.subtitle}>Admin Control Center</p>
          </div>
        </div>
        <button onClick={fetchReports} className={styles.refreshBtn} disabled={loading}>
          Refresh Queue
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Reports</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <div className={styles.statLabel}>Pending Action</div>
          <div className={styles.statValue}>{stats.pending}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statResolved}`}>
          <div className={styles.statLabel}>Resolved</div>
          <div className={styles.statValue}>{stats.resolved}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statDismissed}`}>
          <div className={styles.statLabel}>Dismissed</div>
          <div className={styles.statValue}>{stats.dismissed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "pending" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Queue ({stats.pending})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "resolved" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("resolved")}
        >
          Resolved ({stats.resolved})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "dismissed" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("dismissed")}
        >
          Dismissed ({stats.dismissed})
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Fetching moderation reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={48} className={styles.emptyIcon} />
            <h3>All clear!</h3>
            <p>No reports found in the &ldquo;{activeTab}&rdquo; state.</p>
          </div>
        ) : (
          <div className={styles.reportsList}>
            {filteredReports.map((report) => (
              <div key={report.id} className={styles.reportCard}>
                {/* Report Header */}
                <div className={styles.reportHeader}>
                  <div className={styles.reportMeta}>
                    <span
                      className={`${styles.badge} ${
                        report.reason === "scam" || report.reason === "harassment"
                          ? styles.badgeDanger
                          : report.reason === "fake_products" ||
                            report.reason === "inappropriate_media"
                          ? styles.badgeWarning
                          : styles.badgeDefault
                      }`}
                    >
                      {getReasonLabel(report.reason)}
                    </span>
                    <span className={styles.reportTime}>
                      <Clock size={12} />
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className={styles.reportId}>ID: {report.id.substring(0, 8)}</span>
                </div>

                {/* Report Content details */}
                <div className={styles.reportDetail}>
                  <p className={styles.description}>
                    <strong>Description:</strong>{" "}
                    {report.description ? (
                      <span className={styles.descText}>&ldquo;{report.description}&rdquo;</span>
                    ) : (
                      <em className={styles.noText}>No details provided by reporter.</em>
                    )}
                  </p>

                  <div className={styles.relationGrid}>
                    {/* Reporter info */}
                    <div className={styles.relationBlock}>
                      <span className={styles.relationTitle}>Reporter</span>
                      <div className={styles.relationUser}>
                        <User size={16} />
                        <Link href={`/profile/${report.reporter.username}`} className={styles.userLink}>
                          @{report.reporter.username}
                        </Link>
                      </div>
                    </div>

                    {/* Reported Target */}
                    <div className={styles.relationBlock}>
                      <span className={styles.relationTitle}>Targeted Account</span>
                      {report.reported_user ? (
                        <div className={styles.relationUser}>
                          <User size={16} />
                          <Link href={`/profile/${report.reported_user.username}`} className={styles.userLink}>
                            @{report.reported_user.username}
                          </Link>
                          {report.reported_user.is_suspended && (
                            <span className={styles.suspendedTag}>SUSPENDED</span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.noTarget}>No target user</span>
                      )}
                    </div>
                  </div>

                  {/* Reported Post */}
                  {report.reported_post && (
                    <div className={styles.reportedPostBox}>
                      <div className={styles.reportedPostHeader}>
                        <FileText size={16} />
                        <span>Reported Post ({report.reported_post.status})</span>
                        <Link
                          href={`/post/${report.reported_post.id}`}
                          target="_blank"
                          className={styles.viewPostLink}
                        >
                          View Post <ExternalLink size={12} />
                        </Link>
                      </div>
                      <div className={styles.reportedPostDetails}>
                        <p className={styles.postCaption}>
                          <strong>Caption:</strong>{" "}
                          {report.reported_post.caption || <em>No caption</em>}
                        </p>
                        <p className={styles.postOwner}>
                          <strong>Author:</strong> @{report.reported_post.user.username}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons (Pending Queue) */}
                {report.status === "pending" && (
                  <div className={styles.reportActions}>
                    <button
                      className={styles.actionBtnDismiss}
                      onClick={() => handleAction(report.id, "dismiss")}
                      disabled={actionLoadingId === report.id}
                    >
                      Dismiss Report
                    </button>
                    
                    <button
                      className={styles.actionBtnResolve}
                      onClick={() => handleAction(report.id, "resolve")}
                      disabled={actionLoadingId === report.id}
                    >
                      Resolve
                    </button>

                    {report.reported_post && report.reported_post.status !== "deleted" && (
                      <button
                        className={styles.actionBtnDeletePost}
                        onClick={() => handleAction(report.id, "delete_post")}
                        disabled={actionLoadingId === report.id}
                      >
                        <Trash2 size={14} /> Remove Post
                      </button>
                    )}

                    {report.reported_user && !report.reported_user.is_suspended && (
                      <button
                        className={styles.actionBtnSuspendUser}
                        onClick={() => handleAction(report.id, "suspend_user")}
                        disabled={actionLoadingId === report.id}
                      >
                        <UserX size={14} /> Suspend User
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Alert */}
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
