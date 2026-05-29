"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ShoppingBag,
  Paperclip,
  Smile,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import styles from "./chats.module.css";

interface ChatRoom {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  recipient: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  product_id?: string | null;
  is_read: boolean;
  created_at: string;
  product?: {
    id: string;
    title: string;
    price: number;
    thumbnail: string;
  } | null;
}

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  
  // Chats list and selection
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Inputs
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload/Attachment states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Typing states
  const [otherTypingUsers, setOtherTypingUsers] = useState<string[]>([]);
  const [isTypingState, setIsTypingState] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingApiIntervalRef = useRef<number>(0);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch all chat rooms
  const fetchRooms = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingRooms(true);
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.chats || []);
      }
    } catch (e) {
      console.error("Failed to load rooms:", e);
    } finally {
      if (showLoading) setLoadingRooms(false);
    }
  }, []);

  // Fetch messages for active chat room
  const fetchMessages = useCallback(async (chatId: string, showLoading = false) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Reset unread count globally in navbar by notifying other components
        window.dispatchEvent(new CustomEvent("chat-read-update"));
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, []);

  // Fetch typing users for active chat room
  const fetchTypingUsers = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/typing`);
      if (res.ok) {
        const data = await res.json();
        setOtherTypingUsers(data.typingUsers || []);
      }
    } catch (e) {
      console.error("Failed to fetch typing users:", e);
    }
  }, []);

  // Sync typing indicator status with backend
  const updateTypingState = useCallback(async (chatId: string, typing: boolean) => {
    try {
      await fetch(`/api/chats/${chatId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: typing }),
      });
    } catch (e) {
      console.error("Failed to update typing status:", e);
    }
  }, []);

  // Handle user keypress typing tracker
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!activeChatId) return;

    if (!isTypingState) {
      setIsTypingState(true);
      updateTypingState(activeChatId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingState(false);
      updateTypingState(activeChatId, false);
    }, 2000);
  };

  // Select target user from query param on mount
  useEffect(() => {
    if (!currentUser) return;

    fetchRooms(true);

    const initChatFromParams = async () => {
      const userIdParam = searchParams.get("userId");
      const productIdParam = searchParams.get("productId");

      if (userIdParam) {
        try {
          // Initialize or get chat room
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userIdParam }),
          });

          if (res.ok) {
            const data = await res.json();
            const chatId = data.chat.id;
            setActiveChatId(chatId);
            
            // If product sharing query is present, send product message automatically
            if (productIdParam) {
              await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: "Shared a product details card",
                  productId: productIdParam,
                }),
              });
            }

            // Reload rooms list and load message feed
            fetchRooms();
            fetchMessages(chatId, true);
          }
        } catch (e) {
          console.error("Failed to initialize chat from parameters:", e);
        }
      }
    };

    initChatFromParams();
  }, [currentUser, searchParams, fetchRooms, fetchMessages]);

  // Selected active room data sync
  useEffect(() => {
    if (activeChatId) {
      const room = rooms.find((r) => r.id === activeChatId);
      if (room) setActiveRoom(room);
    } else {
      setActiveRoom(null);
    }
  }, [activeChatId, rooms]);

  // Set up polling for messages and active rooms list
  useEffect(() => {
    if (!activeChatId) return;

    // Scroll to bottom immediately on room open
    setTimeout(scrollToBottom, 200);

    // Message/typing poll interval (every 2s)
    const messagePollInterval = setInterval(() => {
      fetchMessages(activeChatId);
      fetchTypingUsers(activeChatId);
    }, 2000);

    // Active rooms poll interval (every 5s)
    const roomsPollInterval = setInterval(() => {
      fetchRooms();
    }, 5000);

    return () => {
      clearInterval(messagePollInterval);
      clearInterval(roomsPollInterval);
      // Clean up typing timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Mark as not typing on room leave
      updateTypingState(activeChatId, false);
    };
  }, [activeChatId, fetchMessages, fetchTypingUsers, fetchRooms, scrollToBottom, updateTypingState]);

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Select a room manually
  const handleSelectRoom = (roomId: string) => {
    setActiveChatId(roomId);
    setError(null);
    fetchMessages(roomId, true);
  };

  // Handle file select attachment
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB)");
      return;
    }

    setUploadingFile(file);
    setIsUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chats/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await res.json();
      setUploadingUrl(data.url);
    } catch (err) {
      setError("Failed to upload attachment");
      setUploadingFile(null);
      console.error(err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeAttachment = () => {
    setUploadingFile(null);
    setUploadingUrl(null);
    setError(null);
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || (!inputText.trim() && !uploadingUrl)) return;

    const textToSend = inputText.trim();
    const mediaToSend = uploadingUrl;

    // Reset local inputs immediately for smooth UI feedback
    setInputText("");
    removeAttachment();

    // Trigger typing state reset
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTypingState(false);
    updateTypingState(activeChatId, false);

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToSend || "Sent an image",
          mediaUrl: mediaToSend,
        }),
      });

      if (res.ok) {
        // Optimistically pull updated message feed and sync rooms snippet
        fetchMessages(activeChatId);
        fetchRooms();
      } else {
        throw new Error("Failed to send message");
      }
    } catch (e) {
      setError("Failed to send message. Please try again.");
    }
  };

  // Filter rooms based on search text
  const filteredRooms = rooms.filter((room) =>
    room.recipient.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.recipient.display_name &&
      room.recipient.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyChatViewport}>
          <AlertCircle size={48} className="text-secondary" />
          <h2 className="text-heading">Sign In Required</h2>
          <p className="text-caption">Please sign in to read and write messages.</p>
          <button onClick={() => router.push("/login")} className="btn btn-primary mt-2">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.container} ${activeChatId ? styles.mobileChatOpen : ""}`}
      id="chats-page-layout"
    >
      <div className={styles.chatsLayout}>
        {/* Rooms Sidebar (Left) */}
        <div className={styles.roomsPane}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.roomsList}>
            {loadingRooms ? (
              <div className="flex flex-col items-center justify-center p-8 gap-2 text-caption">
                <div className={styles.spinnerSmall} />
                <span>Loading active chats...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-caption">
                <p>No active chats found.</p>
                <p className="text-micro mt-2">Start a chat by visiting a seller's profile.</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isActive = room.id === activeChatId;
                const initials = (room.recipient.display_name || room.recipient.username || "U")
                  .substring(0, 2)
                  .toUpperCase();

                // Compute unread count for this room locally or dynamically
                // (Note: in fallback mode, unread states are stored in the json file)
                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room.id)}
                    className={`${styles.roomItem} ${isActive ? styles.roomActive : ""}`}
                  >
                    {room.recipient.avatar_url ? (
                      <img
                        src={room.recipient.avatar_url}
                        alt={room.recipient.username}
                        className={styles.roomAvatar}
                      />
                    ) : (
                      <div className={styles.roomAvatarFallback}>{initials}</div>
                    )}

                    <div className={styles.roomInfo}>
                      <div className={styles.roomHeader}>
                        <h3 className={styles.roomName}>
                          {room.recipient.display_name || room.recipient.username}
                        </h3>
                        {room.lastMessage && (
                          <span className={styles.roomTime}>
                            {(() => {
                              const date = new Date(room.lastMessage.created_at);
                              return date.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            })()}
                          </span>
                        )}
                      </div>
                      <div className={styles.roomMessageRow}>
                        <p className={styles.roomSnippet}>
                          {room.lastMessage?.content || "No messages yet"}
                        </p>
                        {/* If last message is unread and not sent by me */}
                        {room.lastMessage && 
                         room.lastMessage.sender_id !== currentUser.id && 
                         (room as any).unreadCount > 0 && (
                          <span className={styles.unreadBadge}>
                            {(room as any).unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Feed Panel (Right) */}
        <div className={styles.chatPane}>
          {activeRoom ? (
            <>
              {/* Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatRecipientInfo}>
                  <button
                    onClick={() => setActiveChatId(null)}
                    className={styles.backButtonMobile}
                    aria-label="Back to rooms list"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  {activeRoom.recipient.avatar_url ? (
                    <img
                      src={activeRoom.recipient.avatar_url}
                      alt={activeRoom.recipient.username}
                      className={styles.roomAvatar}
                    />
                  ) : (
                    <div className={styles.roomAvatarFallback}>
                      {(activeRoom.recipient.display_name || activeRoom.recipient.username)
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className={styles.chatRecipientName}>
                      {activeRoom.recipient.display_name || activeRoom.recipient.username}
                    </h2>
                    <p className={styles.statusText}>
                      {otherTypingUsers.length > 0 ? "typing..." : "online"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message History View */}
              <div className={styles.messagesList}>
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-2 text-caption">
                    <div className={styles.spinnerSmall} />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-caption flex-1">
                    <MessageCircle size={32} strokeWidth={1.5} className="mb-2 text-secondary" />
                    <p>No messages yet.</p>
                    <p className="text-micro">Send a greeting message to start negotiating!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageWrapper} ${
                          isMe ? styles.messageMe : styles.messageOther
                        }`}
                      >
                        {/* Shared Product Attachment */}
                        {msg.product && (
                          <div
                            onClick={() => router.push(`/product/${msg.product?.id}`)}
                            className={styles.sharedProductCard}
                          >
                            <div className={styles.productThumb}>
                              {msg.product.thumbnail ? (
                                <img src={msg.product.thumbnail} alt={msg.product.title} />
                              ) : (
                                <ShoppingBag size={20} style={{ opacity: 0.3 }} />
                              )}
                            </div>
                            <div className={styles.productDetails}>
                              <h4 className={styles.productTitle}>{msg.product.title}</h4>
                              <span className={styles.productPrice}>
                                ₹{msg.product.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Media attachment */}
                        {msg.media_url && (
                          <div
                            onClick={() => window.open(msg.media_url!, "_blank")}
                            className={styles.mediaAttachment}
                          >
                            <img src={msg.media_url} alt="Shared attachment" />
                          </div>
                        )}

                        {/* Message Text Bubble */}
                        <div className={styles.messageBubble}>
                          <span>{msg.content}</span>
                        </div>

                        {/* Timestamp */}
                        <span className={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                {/* Auto Scroll Anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicators */}
              {otherTypingUsers.length > 0 && (
                <div className={styles.typingIndicator}>
                  <span>{otherTypingUsers[0]} is typing</span>
                  <div className={styles.typingDots}>
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                  </div>
                </div>
              )}

              {/* Input Form */}
              <div className={styles.inputBar}>
                {/* Selected File Uploading Preview */}
                {uploadingFile && (
                  <div className={styles.uploadPreviewBar}>
                    <span className={styles.previewText}>
                      <ImageIcon size={14} className="text-secondary" />
                      {isUploadingMedia ? "Uploading..." : `Image: ${uploadingFile.name}`}
                    </span>
                    <button
                      onClick={removeAttachment}
                      disabled={isUploadingMedia}
                      className={styles.cancelUploadBtn}
                      aria-label="Remove image attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className={styles.inputBarRow}>
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className={styles.attachBtn}
                    disabled={isUploadingMedia}
                    title="Attach Image"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />

                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={handleInputChange}
                    className={styles.messageInput}
                  />

                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={
                      isUploadingMedia ||
                      (!inputText.trim() && !uploadingUrl)
                    }
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className={styles.emptyChatViewport}>
              <div className={styles.emptyViewportIcon}>💬</div>
              <h2 className={styles.emptyViewportTitle}>Start Conversation</h2>
              <p className={styles.emptyViewportText}>
                Select a chat from the sidebar or click "Message" on a seller's profile
                page to start direct negotiations.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-red-950/80 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between shadow-lg z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
