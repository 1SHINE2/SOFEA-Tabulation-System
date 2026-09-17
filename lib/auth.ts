// lib/auth.ts
// ─── PIN-Based Authentication ─────────────────────────────────────────────────

import { ADMIN_PIN } from "./types";
import type { Judge, UserRole } from "./types";
import { getAllLocalJudges } from "./db";

export interface Session {
  role: UserRole;
  judgeId?: string;
  judgeName?: string;
  email?: string;
}

const SESSION_KEY = "sofea_session";

/**
 * Verify judge authorization using Name and Google/Gmail account registered by Admin.
 * Returns judge profile if authorized, null otherwise.
 */
export function verifyJudgeCredentials(name: string, email: string): Judge | null {
  const judges = getAllLocalJudges();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().toLowerCase();

  // Try matching by exact email first
  const emailFound = judges.find(
    (j) => (j.email || "").trim().toLowerCase() === cleanEmail
  );
  if (emailFound) return emailFound;

  // Try matching by name and domain prefix
  const matchFound = judges.find((j) => {
    const jEmail = (j.email || "").trim().toLowerCase();
    const jName = (j.name || "").trim().toLowerCase();
    return (
      jEmail === cleanEmail ||
      (jName.length > 0 && cleanName.length > 0 && (jName.includes(cleanName) || cleanName.includes(jName)))
    );
  });

  return matchFound || null;
}

/**
 * Validate a PIN against judges and admin.
 * Returns session data if valid, null otherwise.
 */
export function validatePin(pin: string): Session | null {
  // Check admin PIN first
  if (pin === ADMIN_PIN) {
    return { role: "admin" };
  }

  // Check dynamic judges from all competitions
  const judges = getAllLocalJudges();
  const judge = judges.find((j) => j.pin === pin);
  if (judge) {
    // Record audit details in localStorage
    try {
      const compId = judge.competitionId || "comp_1";
      const raw = localStorage.getItem(`sofea_judges_${compId}`);
      if (raw) {
        const list: Judge[] = JSON.parse(raw);
        const updated = list.map((j) => {
          if (j.id === judge.id) {
            return {
              ...j,
              lastLoginAt: Date.now(),
              loginCount: (j.loginCount || 0) + 1,
            };
          }
          return j;
        });
        localStorage.setItem(`sofea_judges_${compId}`, JSON.stringify(updated));
      }
    } catch (e) {}

    return {
      role: "judge",
      judgeId: judge.id,
      judgeName: judge.name,
      email: judge.email,
    };
  }

  return null;
}

/**
 * Validate a PIN specifically for a given role.
 */
export function validatePinForRole(pin: string, role: UserRole): Session | null {
  const session = validatePin(pin);
  if (!session) return null;
  if (session.role !== role) return null;
  return session;
}

/**
 * Save session to localStorage.
 */
export function saveSession(session: Session): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

/**
 * Load session from localStorage.
 */
export function getSession(): Session | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Clear session (logout).
 */
export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Get judge info by ID.
 */
export function getJudgeById(judgeId: string): Judge | undefined {
  const judges = getAllLocalJudges();
  return judges.find((j) => j.id === judgeId);
}
