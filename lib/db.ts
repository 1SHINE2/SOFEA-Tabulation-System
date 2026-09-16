// lib/db.ts
// ─── Firestore + LocalStorage Hybrid Real-time Database Helpers ─────────────────

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Competition, Participant, ScoreEntry } from "./types";

// Helper for local event broadcast across same window & cross-tab
const SYNC_EVENT = "sofea_tabulation_db_sync";

function notifyLocalSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  try {
    localStorage.setItem("sofea_sync_ping", Date.now().toString());
  } catch (e) {
    // ignore quota/privacy errors
  }
}

// ─── LocalStorage Cache Helpers ────────────────────────────────────────────────

function getLocalParticipants(compId: string): Participant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_parts_${compId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalParticipants(compId: string, parts: Participant[]) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalParticipants(compId);
    const map = new Map<string, Participant>();
    existing.forEach((p) => map.set(p.id, p));
    parts.forEach((p) => map.set(p.id, p));
    const merged = Array.from(map.values()).sort((a, b) => a.order - b.order);
    localStorage.setItem(`sofea_parts_${compId}`, JSON.stringify(merged));
    notifyLocalSync();
  } catch (e) {}
}

function getLocalScores(compId: string): ScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_scores_${compId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScores(compId: string, scores: ScoreEntry[]) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalScores(compId);
    const map = new Map<string, ScoreEntry>();
    existing.forEach((s) => map.set(`${s.judgeId}_${s.participantId}`, s));
    scores.forEach((s) => map.set(`${s.judgeId}_${s.participantId}`, s));
    const merged = Array.from(map.values());
    localStorage.setItem(`sofea_scores_${compId}`, JSON.stringify(merged));
    notifyLocalSync();
  } catch (e) {}
}

// ─── Competitions ─────────────────────────────────────────────────────────────

export async function getCompetitions(): Promise<Competition[]> {
  try {
    const snap = await getDocs(collection(db, "competitions"));
    if (snap.docs.length > 0) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competition));
    }
  } catch (err) {
    console.warn("Firestore unavailable, using local competition state.");
  }
  return [];
}

export async function getCompetition(id: string): Promise<Competition | null> {
  try {
    const snap = await getDoc(doc(db, "competitions", id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Competition;
    }
  } catch (err) {
    console.warn("Firestore unavailable, fallback competition used.");
  }
  return null;
}

export async function createCompetition(data: Omit<Competition, "id" | "createdAt">): Promise<string> {
  const compId = "comp_" + Date.now();
  try {
    const ref = await addDoc(collection(db, "competitions"), {
      ...data,
      createdAt: Date.now(),
    });
    return ref.id;
  } catch (err) {
    return compId;
  }
}

export async function updateCompetitionStatus(
  competitionId: string,
  status: Competition["status"]
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_comp_status_${competitionId}`, status);
      notifyLocalSync();
    } catch (e) {}
  }
  try {
    await updateDoc(doc(db, "competitions", competitionId), { status });
  } catch (err) {
    console.warn("Firestore status update bypassed locally.");
  }
}

// ─── Participants ─────────────────────────────────────────────────────────────

export function subscribeParticipants(
  competitionId: string,
  callback: (participants: Participant[]) => void
): Unsubscribe {
  // Emit initial local state immediately
  callback(getLocalParticipants(competitionId));

  let firestoreUnsub: Unsubscribe | null = null;

  try {
    const q = query(
      collection(db, "competitions", competitionId, "participants"),
      orderBy("order", "asc")
    );
    firestoreUnsub = onSnapshot(
      q,
      (snap) => {
        const remoteParts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Participant));
        if (remoteParts.length > 0) {
          const local = getLocalParticipants(competitionId);
          const map = new Map<string, Participant>();
          local.forEach((p) => map.set(p.id, p));
          remoteParts.forEach((p) => map.set(p.id, p));
          const merged = Array.from(map.values()).sort((a, b) => a.order - b.order);
          saveLocalParticipants(competitionId, merged);
          callback(merged);
        } else {
          callback(getLocalParticipants(competitionId));
        }
      },
      (_err) => {
        callback(getLocalParticipants(competitionId));
      }
    );
  } catch (e) {
    callback(getLocalParticipants(competitionId));
  }

  // Cross-tab & same-tab event listeners for local instant sync
  function handleLocalEvent() {
    callback(getLocalParticipants(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (firestoreUnsub) firestoreUnsub();
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function addParticipant(
  competitionId: string,
  name: string,
  order: number
): Promise<string> {
  const newPart: Participant = {
    id: "part_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    name,
    order,
    addedAt: Date.now(),
  };

  // 1. Instant local update
  const current = getLocalParticipants(competitionId);
  const map = new Map<string, Participant>();
  current.forEach((p) => map.set(p.id, p));
  map.set(newPart.id, newPart);
  const updated = Array.from(map.values()).sort((a, b) => a.order - b.order);
  
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_parts_${competitionId}`, JSON.stringify(updated));
      notifyLocalSync();
    } catch (e) {}
  }

  // 2. Async Cloud sync
  try {
    await addDoc(
      collection(db, "competitions", competitionId, "participants"),
      { name, order, addedAt: Date.now() }
    );
  } catch (err) {
    console.warn("Saved participant locally.");
  }

  return newPart.id;
}

export async function removeParticipant(
  competitionId: string,
  participantId: string
): Promise<void> {
  // 1. Instant local update
  const current = getLocalParticipants(competitionId);
  const updated = current.filter((p) => p.id !== participantId);
  
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_parts_${competitionId}`, JSON.stringify(updated));
      notifyLocalSync();
    } catch (e) {}
  }

  // 2. Async Cloud sync
  try {
    await deleteDoc(doc(db, "competitions", competitionId, "participants", participantId));
  } catch (err) {
    console.warn("Removed participant locally.");
  }
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export function subscribeScores(
  competitionId: string,
  callback: (scores: ScoreEntry[]) => void
): Unsubscribe {
  // Emit initial local state immediately
  callback(getLocalScores(competitionId));

  let firestoreUnsub: Unsubscribe | null = null;

  try {
    const q = collection(db, "competitions", competitionId, "scores");
    firestoreUnsub = onSnapshot(
      q,
      (snap) => {
        const remoteScores = snap.docs.map((d) => ({ ...d.data() } as ScoreEntry));
        if (remoteScores.length > 0) {
          const local = getLocalScores(competitionId);
          const map = new Map<string, ScoreEntry>();
          local.forEach((s) => map.set(`${s.judgeId}_${s.participantId}`, s));
          remoteScores.forEach((s) => map.set(`${s.judgeId}_${s.participantId}`, s));
          const merged = Array.from(map.values());
          saveLocalScores(competitionId, merged);
          callback(merged);
        } else {
          callback(getLocalScores(competitionId));
        }
      },
      (_err) => {
        callback(getLocalScores(competitionId));
      }
    );
  } catch (e) {
    callback(getLocalScores(competitionId));
  }

  // Cross-tab & same-tab event listeners for local instant sync
  function handleLocalEvent() {
    callback(getLocalScores(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (firestoreUnsub) firestoreUnsub();
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function saveScore(
  competitionId: string,
  judgeId: string,
  participantId: string,
  scores: { c1: number; c2: number; c3: number; c4: number },
  isDraft: boolean
): Promise<void> {
  const newEntry: ScoreEntry = {
    judgeId,
    participantId,
    competitionId,
    ...scores,
    isDraft,
    submittedAt: isDraft ? null : Date.now(),
  };

  // 1. Instant local map merge (preserves all other judges' scores)
  const current = getLocalScores(competitionId);
  const map = new Map<string, ScoreEntry>();
  current.forEach((s) => map.set(`${s.judgeId}_${s.participantId}`, s));
  map.set(`${judgeId}_${participantId}`, newEntry);
  const merged = Array.from(map.values());

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_scores_${competitionId}`, JSON.stringify(merged));
      notifyLocalSync();
    } catch (e) {}
  }

  // 2. Async Cloud sync
  try {
    const scoreId = `${judgeId}_${participantId}`;
    await setDoc(doc(db, "competitions", competitionId, "scores", scoreId), newEntry);
  } catch (err) {
    console.warn("Saved score locally.");
  }
}

export async function deleteScore(
  competitionId: string,
  judgeId: string,
  participantId: string
): Promise<void> {
  // 1. Instant local removal
  const current = getLocalScores(competitionId);
  const updated = current.filter(
    (s) => !(s.judgeId === judgeId && s.participantId === participantId)
  );

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_scores_${competitionId}`, JSON.stringify(updated));
      notifyLocalSync();
    } catch (e) {}
  }

  // 2. Async Cloud sync
  try {
    const scoreId = `${judgeId}_${participantId}`;
    await deleteDoc(doc(db, "competitions", competitionId, "scores", scoreId));
  } catch (err) {
    console.warn("Deleted score locally.");
  }
}

// ─── PIN Management ───────────────────────────────────────────────────────────

export async function getPins(): Promise<Record<string, string> | null> {
  try {
    const snap = await getDoc(doc(db, "config", "pins"));
    if (snap.exists()) return snap.data() as Record<string, string>;
  } catch (e) {}
  return null;
}

export async function updatePins(pins: Record<string, string>): Promise<void> {
  try {
    await setDoc(doc(db, "config", "pins"), pins);
  } catch (e) {}
}
