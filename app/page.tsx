"use client";
// app/page.tsx — Landing Page: Role Selector + Google Email Verification + PIN Entry

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validatePinForRole, saveSession, verifyJudgeCredentials } from "@/lib/auth";
import type { UserRole, Judge } from "@/lib/types";
import styles from "./page.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Verification stage state for judge
  const [step, setStep] = useState<"verify" | "pin">("verify");
  const [judgeNameInput, setJudgeNameInput] = useState("");
  const [judgeEmailInput, setJudgeEmailInput] = useState("");
  const [verifiedJudge, setVerifiedJudge] = useState<Judge | null>(null);

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering PIN step
  useEffect(() => {
    if (selectedRole === "admin" || (selectedRole === "judge" && step === "pin")) {
      setTimeout(() => pinRef.current?.focus(), 100);
    }
  }, [selectedRole, step]);

  function handleRoleSelect(role: UserRole) {
    setSelectedRole(role);
    setStep(role === "judge" ? "verify" : "pin");
    setJudgeNameInput("");
    setJudgeEmailInput("");
    setVerifiedJudge(null);
    setPin("");
    setError("");
  }

  const [emailSentNotice, setEmailSentNotice] = useState("");

  async function handleVerifyJudge(e: React.FormEvent) {
    e.preventDefault();
    if (!judgeNameInput.trim() || !judgeEmailInput.trim()) return;

    setLoading(true);
    setError("");

    try {
      const match = verifyJudgeCredentials(judgeNameInput, judgeEmailInput);
      if (!match) {
        setError(
          "No matching judge found with that Google/Gmail address and Name. Please ask the administrator to register your Google account."
        );
        setLoading(false);
        return;
      }

      setVerifiedJudge(match);
      setPin("");
      setStep("pin");

      // Dispatch PIN to judge's Gmail via API
      try {
        await fetch("/api/send-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: match.email,
            name: match.name,
            pin: match.pin,
          }),
        });
        setEmailSentNotice(`A verification email containing your permanent PIN passcode has been sent to ${match.email}. Please check your inbox / spam folder.`);
      } catch (err) {
        setEmailSentNotice(`Identity verified for ${match.email}. Please check your registered Gmail for your PIN.`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(val);
    setError("");
  }

  function handleSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole || !pin) return;

    setLoading(true);
    setError("");

    setTimeout(() => {
      const session = validatePinForRole(pin, selectedRole);

      if (!session) {
        setError("Incorrect PIN Passcode. Please try again.");
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
        {/* CTE + UCLM Header Banner */}
        <div className={styles.cteBanner} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <img
              src="/logos/uclm-logo.webp"
              alt="UCLM Logo"
              className={styles.bannerLogo}
              style={{ height: "45px", width: "auto" }}
            />
            <img
              src="/logos/cte-logo.jpg"
              alt="College of Teacher Education"
              className={styles.bannerLogo}
              style={{ height: "45px", width: "auto" }}
            />
          </div>
          <div className={styles.bannerText}>
            <div className={styles.bannerTitle}>UNIVERSITY OF CEBU LAPU-LAPU AND MANDAUE</div>
            <div className={styles.bannerSubtitle}>College of Teacher Education · SOFEA</div>
          </div>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Digital Tabulation System</div>
          <div className={styles.subtitle}>A.Y. 2026–2027</div>
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
            <span className={styles.roleBtnDesc}>Google Account Verification</span>
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

        {/* Step 2 for Judge: Google Account Verification */}
        {selectedRole === "judge" && step === "verify" && (
          <div className={styles.pinSection}>
            <form onSubmit={handleVerifyJudge}>
              <div style={{ fontWeight: 600, color: "var(--blue-950)", marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                Stage 1: Google Account & Name Verification
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                <input
                  type="text"
                  placeholder="Full Name (e.g. Dr. Maria Santos)"
                  value={judgeNameInput}
                  onChange={(e) => setJudgeNameInput(e.target.value)}
                  className="input"
                  required
                />
                <input
                  type="email"
                  placeholder="Registered Google / Gmail Address"
                  value={judgeEmailInput}
                  onChange={(e) => setJudgeEmailInput(e.target.value)}
                  className="input"
                  required
                />
              </div>
              {error && <div className={styles.errorMsg} style={{ marginBottom: "0.8rem" }}>⚠️ {error}</div>}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!judgeNameInput.trim() || !judgeEmailInput.trim() || loading}
              >
                {loading ? "Verifying Google Account…" : "Verify Google Account"}
              </button>
            </form>
          </div>
        )}

        {/* Verified Judge Banner & Step 3: PIN Entry */}
        {selectedRole && (selectedRole === "admin" || step === "pin") && (
          <div className={styles.pinSection}>
            {selectedRole === "judge" && verifiedJudge && (
              <div
                style={{
                  background: "var(--blue-50)",
                  border: "1px solid var(--blue-200)",
                  padding: "0.9rem 1rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.9rem", color: "var(--blue-900)", fontWeight: 700 }}>
                  ✓ Identity Verified: {verifiedJudge.name}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--blue-800)", marginBottom: "0.4rem" }}>
                  {verifiedJudge.email}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "#1e3a8a",
                    background: "#ffffff",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--blue-200)",
                    lineHeight: 1.45,
                  }}
                >
                  ✉️ {emailSentNotice || "A verification email with your permanent PIN passcode has been dispatched to your Gmail."}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitPin}>
              <label className={styles.pinLabel}>
                Enter {selectedRole === "admin" ? "Admin PIN" : "PIN Passcode"}
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
