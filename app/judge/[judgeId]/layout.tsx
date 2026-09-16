"use client";
import { use, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { LogOut } from "lucide-react";
import styles from "./layout.module.css";

export default function JudgeLayout(props: { children: ReactNode; params: Promise<{ judgeId: string }> }) {
  const { children } = props;
  const params = use(props.params);
  const { session, loading, logout } = useSession("judge");

  if (loading || !session) return null;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <img src="/logos/cte-logo.jpg" alt="CTE Logo" className={styles.logo} />
            <div>
              <h1 className={styles.title}>SOFEA Tabulation</h1>
              <p className={styles.subtitle}>Judge Portal</p>
            </div>
          </div>
          <div className={styles.userSection}>
            <span className={styles.judgeName}>{session.judgeName}</span>
            <button onClick={logout} className={styles.logoutBtn} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
