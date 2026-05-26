import BottomNav from "@/components/navigation/bottom-nav";
import styles from "./app-layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <main className={styles.main}>{children}</main>
      <BottomNav />
    </div>
  );
}
