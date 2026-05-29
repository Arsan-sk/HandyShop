"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/navigation/bottom-nav";
import SidebarNav from "@/components/navigation/sidebar-nav";
import styles from "./app-layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isQuickLook = pathname?.startsWith("/quicklook");

  return (
    <div className={styles.container}>
      <SidebarNav />
      <main className={`${styles.main} ${isQuickLook ? styles.mainQuickLook : ""}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
