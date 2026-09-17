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
      <main className={styles.main}>{children}</main>
    </div>
  );
}
