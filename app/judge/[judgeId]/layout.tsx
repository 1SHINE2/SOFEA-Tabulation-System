"use client";
import { use, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import styles from "./layout.module.css";

export default function JudgeLayout(props: { children: ReactNode; params: Promise<{ judgeId: string }> }) {
  const { children } = props;
  const params = use(props.params);
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, logout } = useSession("judge");

  if (loading || !session) return null;

  const isHome = pathname === `/judge/${params.judgeId}`;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            {!isHome && (
              <button
                onClick={() => router.back()}
                className={styles.logoutBtn}
                style={{ marginRight: "0.5rem" }}
                title="Go Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <img src="/logos/uclm-logo.webp" alt="UCLM Logo" className={styles.logo} style={{ height: "36px", width: "auto" }} />
              <img src="/logos/cte-logo.jpg" alt="CTE Logo" className={styles.logo} style={{ height: "36px", width: "auto" }} />
            </div>
            <div>
              <h1 className={styles.title}>SOFEA Tabulation</h1>
              <p className={styles.subtitle}>Judge Portal</p>
            </div>
          </div>
          <div className={styles.userSection}>
            <span className={styles.judgeName}>{session.judgeName}</span>
            <button onClick={logout} className={styles.logoutBtn} aria-label="Logout" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
