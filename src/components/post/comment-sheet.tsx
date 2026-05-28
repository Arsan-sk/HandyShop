"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, CornerDownRight, Trash2, Edit2, Send } from "lucide-react";
import type { Comment } from "@/types";
import styles from "./comment-sheet.module.css";

// Interface for rich comments joined with user details
interface CommentWithUser extends Comment {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CommentSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  onCommentCountChange?: (countChange: number) => void;
}

export default function CommentSheet({
  postId,
  isOpen,
  onClose,
  currentUserId,
  onCommentCountChange,
}: CommentSheetProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentWithUser | null>(null);
  const [editingComment, setEditingComment] = useState<CommentWithUser | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  useEffect(() => {
    if (!isOpen) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!postId || !uuidRegex.test(postId)) {
      console.error("Invalid postId provided to CommentSheet:", postId);
      setError("Failed to load comments due to an invalid post identifier.");
      return;
    }

    const fetchComments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        if (!response.ok) {
          throw new Error("Failed to load comments");
        }
        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error("Error loading comments:", err);
        setError("Could not load comments. Try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [postId, isOpen]);

  // Submit new comment or reply
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingComment) {
        // Edit comment
        const response = await fetch(`/api/comments/${editingComment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update comment");
        }

        const data = await response.json();
        setComments((prev) =>
          prev.map((c) => (c.id === editingComment.id ? data.comment : c))
        );
        setEditingComment(null);
      } else {
        // Create new comment/reply
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: body.trim(),
            parent_comment_id: replyTo ? replyTo.id : null,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to post comment");
        }

        const data = await response.json();
        setComments((prev) => [...prev, data.comment]);
        setReplyTo(null);
        onCommentCountChange?.(1); // Increment count locally

        // Scroll to bottom on new top-level comment
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 50);
      }

      setBody("");
    } catch (err) {
      console.error("Failed to submit comment:", err);
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      // Filter out deleted comment and all its replies (cascade delete)
      setComments((prev) => {
        const deletedIds = new Set([commentId]);
        let sizeBefore;
        do {
          sizeBefore = deletedIds.size;
          prev.forEach((c) => {
            if (c.parent_comment_id && deletedIds.has(c.parent_comment_id)) {
              deletedIds.add(c.id);
            }
          });
        } while (deletedIds.size !== sizeBefore);

        onCommentCountChange?.(-deletedIds.size); // Decrement count locally by the total deleted comments
        return prev.filter((c) => !deletedIds.has(c.id));
      });
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  // Trigger reply mode
  const handleReplyClick = (comment: CommentWithUser) => {
    setEditingComment(null);
    setReplyTo(comment);
    setBody(`@${comment.user.username} `);
  };

  // Trigger edit mode
  const handleEditClick = (comment: CommentWithUser) => {
    setReplyTo(null);
    setEditingComment(comment);
    setBody(comment.body);
  };

  // Cancel reply or edit mode
  const cancelAction = () => {
    setReplyTo(null);
    setEditingComment(null);
    setBody("");
  };

  // Threading logic: group comments
  const topLevelComments = comments.filter((c) => c.parent_comment_id === null);
  const repliesByParentId = comments.reduce<Record<string, CommentWithUser[]>>(
    (acc, comment) => {
      if (comment.parent_comment_id !== null) {
        if (!acc[comment.parent_comment_id]) {
          acc[comment.parent_comment_id] = [];
        }
        acc[comment.parent_comment_id].push(comment);
      }
      return acc;
    },
    {}
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={styles.sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className={styles.handle}>
              <div className={styles.handleBar} />
            </div>

            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>Comments</h2>
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className={styles.list} ref={listRef}>
              {isLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <p>Loading comments...</p>
                </div>
              ) : topLevelComments.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyIcon}>💬</p>
                  <p className={styles.emptyText}>No comments yet</p>
                  <p className={styles.emptySubtext}>Be the first to share your thoughts!</p>
                </div>
              ) : (
                topLevelComments.map((comment) => (
                  <div key={comment.id} className={styles.commentGroup}>
                    {/* Top Level Comment */}
                    <div className={styles.commentItem}>
                      <div className={styles.avatar}>
                        {comment.user.avatar_url ? (
                          <Image
                            src={comment.user.avatar_url}
                            alt={comment.user.username}
                            width={32}
                            height={32}
                            className={styles.avatarImg}
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {comment.user.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className={styles.commentBody}>
                        <div className={styles.meta}>
                          <span className={styles.username}>
                            {comment.user.username}
                          </span>
                          <span className={styles.time}>
                            {getRelativeTime(comment.created_at)}
                          </span>
                          {comment.updated_at !== comment.created_at && (
                            <span className={styles.edited}>edited</span>
                          )}
                        </div>
                        <p className={styles.text}>{comment.body}</p>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleReplyClick(comment)}
                            className={styles.actionBtn}
                          >
                            Reply
                          </button>
                          {currentUserId === comment.user_id && (
                            <>
                              <button
                                onClick={() => handleEditClick(comment)}
                                className={styles.actionBtn}
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(comment.id)}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {repliesByParentId[comment.id]?.map((reply) => (
                      <div
                        key={reply.id}
                        className={`${styles.commentItem} ${styles.replyItem}`}
                      >
                        <CornerDownRight className={styles.replyArrow} size={16} />
                        <div className={styles.avatar}>
                          {reply.user.avatar_url ? (
                            <Image
                              src={reply.user.avatar_url}
                              alt={reply.user.username}
                              width={24}
                              height={24}
                              className={styles.avatarImg}
                            />
                          ) : (
                            <div className={styles.avatarPlaceholderSmall}>
                              {reply.user.username[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.meta}>
                            <span className={styles.username}>
                              {reply.user.username}
                            </span>
                            <span className={styles.time}>
                              {getRelativeTime(reply.created_at)}
                            </span>
                            {reply.updated_at !== reply.created_at && (
                              <span className={styles.edited}>edited</span>
                            )}
                          </div>
                          <p className={styles.text}>{reply.body}</p>
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleReplyClick(comment)}
                              className={styles.actionBtn}
                            >
                              Reply
                            </button>
                            {currentUserId === reply.user_id && (
                              <>
                                <button
                                  onClick={() => handleEditClick(reply)}
                                  className={styles.actionBtn}
                                >
                                  <Edit2 size={12} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Input Form Footer */}
            <div className={styles.footer}>
              {error && <p className={styles.errorText}>{error}</p>}

              {replyTo && (
                <div className={styles.indicator}>
                  <span>Replying to @{replyTo.user.username}</span>
                  <button onClick={cancelAction} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </div>
              )}

              {editingComment && (
                <div className={styles.indicator}>
                  <span>Editing your comment</span>
                  <button onClick={cancelAction} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                  className={styles.input}
                  placeholder={
                    replyTo
                      ? "Write a reply..."
                      : editingComment
                      ? "Edit comment..."
                      : "Add a comment..."
                  }
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 500))}
                  rows={1}
                  required
                />
                <div className={styles.formActions}>
                  <span className={styles.counter}>{body.length}/500</span>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={!body.trim() || isSubmitting}
                    aria-label="Send"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getRelativeTime(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
