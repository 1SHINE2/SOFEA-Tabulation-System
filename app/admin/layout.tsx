"use client";
import { useSession } from "@/hooks/useSession";
import styles from "./layout.module.css";
import { LogOut } from "lucide-react";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, logout } = useSession("admin");

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center", display: "flex" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!session || session.role !== "admin") return null;

  return (
    <div className="page">
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <div className={styles.logoTitle}>
            <img src="/logos/cte-logo.jpg" alt="CTE Logo" className={styles.logo} />
            <h1 className={styles.title}>SOFEA Admin</h1>
          </div>
          <button onClick={logout} className="btn btn-outline" style={{ borderColor: 'white', color: 'white' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
