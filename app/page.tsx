"use client";
// app/page.tsx — Landing Page: Role Selector + PIN Entry

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validatePinForRole, saveSession } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import styles from "./page.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // Auto-focus PIN input when role is selected
  useEffect(() => {
    if (selectedRole) {
      setTimeout(() => pinRef.current?.focus(), 100);
    }
  }, [selectedRole]);

  function handleRoleSelect(role: UserRole) {
    setSelectedRole(role);
    setPin("");
    setError("");
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(val);
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole || !pin) return;

    setLoading(true);
    setError("");

    // Small delay for UX feel
    setTimeout(() => {
      const session = validatePinForRole(pin, selectedRole);

      if (!session) {
        setError("Incorrect PIN. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setPin("");
        setLoading(false);
        pinRef.current?.focus();
        return;
      }

      saveSession(session);

      if (session.role === "admin") {
        router.push("/admin");
      } else {
        router.push(`/judge/${session.judgeId}`);
      }
    }, 400);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* CTE Header Banner — sleek Royal Blue gradient */}
        <div className={styles.cteBanner}>
          <img
            src="/logos/cte-logo.jpg"
            alt="College of Teacher Education"
            className={styles.bannerLogo}
          />
          <div className={styles.bannerText}>
            <div className={styles.bannerTitle}>College of Teacher Education</div>
            <div className={styles.bannerSubtitle}>Society of Future Educators and Administrators</div>
          </div>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Digital Tabulation System</div>
          <div className={styles.subtitle}>
            A.Y. 2026–2027
          </div>
        </div>

        {/* Role Selector */}
        <div className={styles.roleLabel}>Select your role to continue</div>
        <div className={styles.roleGrid}>
          <button
            className={`${styles.roleBtn} ${selectedRole === "judge" ? styles.selected : ""}`}
            onClick={() => handleRoleSelect("judge")}
            type="button"
          >
            <span className={styles.roleBtnIcon}>⚖️</span>
            <span className={styles.roleBtnLabel}>Judge</span>
            <span className={styles.roleBtnDesc}>Score participants</span>
          </button>
          <button
            className={`${styles.roleBtn} ${selectedRole === "admin" ? styles.selected : ""}`}
            onClick={() => handleRoleSelect("admin")}
            type="button"
          >
            <span className={styles.roleBtnIcon}>🖥️</span>
            <span className={styles.roleBtnLabel}>Admin</span>
            <span className={styles.roleBtnDesc}>View & manage scores</span>
          </button>
        </div>

        {/* PIN Entry */}
        {selectedRole && (
          <div className={styles.pinSection}>
            <form onSubmit={handleSubmit}>
              <label className={styles.pinLabel}>
                Enter your {selectedRole === "admin" ? "Admin" : "Judge"} PIN
              </label>
              <div className={styles.pinInputWrap}>
                <input
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={handlePinChange}
                  className={`${styles.pinInput} ${shake ? styles.error : ""}`}
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
              {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={pin.length < 4 || loading}
              >
                {loading ? "Verifying…" : `Enter as ${selectedRole === "admin" ? "Admin" : "Judge"}`}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        © 2026–2027 SOFEA · University of Cebu Lapu-Lapu and Mandaue
      </div>
    </div>
  );
}
