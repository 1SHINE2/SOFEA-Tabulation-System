"use client";
import { use, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import { recordJudgeLogout } from "@/lib/db";
import styles from "./layout.module.css";

export default function JudgeLayout(props: { children: ReactNode; params: Promise<{ judgeId: string }> }) {
  const { children } = props;
  const params = use(props.params);
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, logout } = useSession("judge");

  if (loading || !session) return null;

  const isHome = pathname === `/judge/${params.judgeId}`;

  async function handleLogout() {
    try {
      await recordJudgeLogout("comp_1", params.judgeId);
    } catch (e) {}
    logout();
  }

  function handleGoBack() {
    if (pathname.includes("/score/")) {
      const parentPath = pathname.split("/score/")[0];
      router.push(parentPath);
    } else {
      router.push(`/judge/${params.judgeId}`);
    }
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            {!isHome && (
              <button
                onClick={handleGoBack}
                className={styles.logoutBtn}
                style={{ marginRight: "0.5rem" }}
                title="Go to Previous Section"
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
            <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Logout" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
