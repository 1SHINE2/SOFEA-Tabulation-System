"use client";
import { useSession } from "@/hooks/useSession";
import styles from "./layout.module.css";
import { LogOut, ArrowLeft } from "lucide-react";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, logout } = useSession("admin");
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center", display: "flex" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session || session.role !== "admin") return null;

  const showBackButton = pathname !== "/admin";

  return (
    <div className="page">
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <div className={styles.logoTitle}>
            <img src="/logos/cte-logo.jpg" alt="CTE Logo" className={styles.logo} />
            <div>
              <h1 className={styles.title}>SOFEA Admin</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {showBackButton && (
              <Link href="/admin" className="btn btn-outline" style={{ borderColor: "white", color: "white" }}>
                <ArrowLeft size={16} /> Back to Competitions
              </Link>
            )}
            <button onClick={logout} className="btn btn-outline" style={{ borderColor: "white", color: "white" }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
