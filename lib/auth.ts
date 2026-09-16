// lib/auth.ts
// ─── PIN-Based Authentication ─────────────────────────────────────────────────

import { JUDGES, ADMIN_PIN } from "./types";
import type { Judge, UserRole } from "./types";

export interface Session {
  role: UserRole;
  judgeId?: string;
  judgeName?: string;
}

const SESSION_KEY = "sofea_session";

/**
 * Validate a PIN against judges and admin.
 * Returns session data if valid, null otherwise.
 */
export function validatePin(pin: string): Session | null {
  // Check admin PIN first
  if (pin === ADMIN_PIN) {
    return { role: "admin" };
  }

  // Check judge PINs
  const judge = JUDGES.find((j) => j.pin === pin);
  if (judge) {
    return { role: "judge", judgeId: judge.id, judgeName: judge.name };
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
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
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
  return JUDGES.find((j) => j.id === judgeId);
}
