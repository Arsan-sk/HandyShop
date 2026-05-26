"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import styles from "./chats.module.css";

export default function ChatsPage() {
  return (
    <div className={styles.container} id="chats-page">
      <div className={styles.header}>
        <h1 className="text-heading">Messages</h1>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.emptyState}
      >
        <div className={styles.iconCircle}>
          <MessageCircle size={32} strokeWidth={1.5} />
        </div>
        <h2 className="text-heading">Coming Soon</h2>
        <p className="text-caption">
          Chat with sellers, share products, and negotiate directly. Messaging
          is on its way!
        </p>
      </motion.div>
    </div>
  );
}
