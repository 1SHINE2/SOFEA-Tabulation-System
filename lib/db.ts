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
import type {
  Competition,
  Participant,
  ScoreEntry,
  Judge,
  CriteriaItem,
  CriteriaSet,
  AwardCategory,
} from "./types";
import { DEFAULT_CRITERIA, INITIAL_JUDGES } from "./types";

const SYNC_EVENT = "sofea_tabulation_db_sync";

function notifyLocalSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  try {
    localStorage.setItem("sofea_sync_ping", Date.now().toString());
  } catch (e) {}
}

// ─── LocalStorage Cache Helpers ────────────────────────────────────────────────

function getLocalCompetitions(): Competition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("sofea_competitions");
    if (raw) {
      const comps: Competition[] = JSON.parse(raw);
      if (comps.length > 0) {
        let updated = false;
        const migrated = comps.map((c) => {
          if (c.name === "Best in Pop Sing & Dance" || c.description === "SOFEA Competition") {
            updated = true;
            return {
              ...c,
              name: c.name === "Best in Pop Sing & Dance" ? "General Assembly" : c.name,
              description: c.description === "SOFEA Competition" ? "General Assembly Competition" : c.description,
            };
          }
          return c;
        });
        if (updated) {
          localStorage.setItem("sofea_competitions", JSON.stringify(migrated));
        }
        return migrated;
      }
    }
  } catch {}

  const defaultComp: Competition = {
    id: "comp_1",
    name: "General Assembly",
    academicYear: "2026-2027",
    description: "General Assembly Competition",
    guidelines: [
      "Each performance must strictly last between 3 to 4 minutes.",
      "Performances that fall short of 3 minutes or exceed 4 minutes will incur a deduction.",
      "The performance must feature an original song composition in Pop genre.",
    ],
    status: "active",
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem("sofea_competitions", JSON.stringify([defaultComp]));
  } catch (e) {}
  return [defaultComp];
}

function saveLocalCompetitions(comps: Competition[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sofea_competitions", JSON.stringify(comps));
    notifyLocalSync();
  } catch (e) {}
}

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

function getLocalJudges(compId: string): Judge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_judges_${compId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalJudges(compId: string, judges: Judge[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sofea_judges_${compId}`, JSON.stringify(judges));
    notifyLocalSync();
  } catch (e) {}
}

export function getAllLocalJudges(): Judge[] {
  if (typeof window === "undefined") return [];
  try {
    const list: Judge[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sofea_judges_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const items: Judge[] = JSON.parse(raw);
          list.push(...items);
        }
      }
    }
    return list;
  } catch {
    return [];
  }
}

function getLocalCriteriaSets(compId: string): CriteriaSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_crit_sets_${compId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaultItems = getLocalCriteria(compId);
  return [
    {
      id: "set_default",
      name: "Main Competition Criteria",
      competitionId: compId,
      isActive: true,
      items: defaultItems,
      createdAt: 1,
    },
  ];
}

function saveLocalCriteriaSets(compId: string, sets: CriteriaSet[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sofea_crit_sets_${compId}`, JSON.stringify(sets));
    notifyLocalSync();
  } catch (e) {}
}

function getLocalCriteria(compId: string): CriteriaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_criteria_${compId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CRITERIA.map((c, i) => ({
    id: c.key,
    key: c.key,
    label: c.label,
    weight: c.weight,
    color: c.color,
    rubric: c.rubric,
  }));
}

function saveLocalCriteria(compId: string, items: CriteriaItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sofea_criteria_${compId}`, JSON.stringify(items));
    notifyLocalSync();
  } catch (e) {}
}

function getDeletedAwardIds(compId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`sofea_deleted_awards_${compId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeletedAwardIds(compId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sofea_deleted_awards_${compId}`, JSON.stringify(ids));
    notifyLocalSync();
  } catch (e) {}
}

function getLocalAwards(compId: string): AwardCategory[] {
  if (typeof window === "undefined") return [];

  const deletedIds = getDeletedAwardIds(compId);
  const allCrit = getLocalCriteria(compId);
  const allKeys = allCrit.map((c) => c.key || c.id);

  const defaultAwards: AwardCategory[] = [
    {
      id: "award_overall",
      name: "Overall Winner",
      competitionId: compId,
      criteriaKeys: allKeys.length > 0 ? allKeys : ["c1", "c2", "c3", "c4"],
      createdAt: 1,
    },
    {
      id: "award_vocal",
      name: "Best in Vocal Execution",
      competitionId: compId,
      criteriaKeys: ["c1", "c2"],
      createdAt: 2,
    },
    {
      id: "award_choreo",
      name: "Best in Pop Choreography",
      competitionId: compId,
      criteriaKeys: ["c3", "c4"],
      createdAt: 3,
    },
  ];

  let savedAwards: AwardCategory[] = [];
  try {
    const raw = localStorage.getItem(`sofea_awards_${compId}`);
    if (raw) {
      savedAwards = JSON.parse(raw);
    }
  } catch {}

  const mergedMap = new Map<string, AwardCategory>();
  // Add defaults if not deleted
  defaultAwards.forEach((a) => {
    if (!deletedIds.includes(a.id)) {
      mergedMap.set(a.id, a);
    }
  });

  // Merge saved awards if not deleted
  savedAwards.forEach((a) => {
    if (!deletedIds.includes(a.id)) {
      if (a.id === "award_overall") {
        mergedMap.set(a.id, {
          ...a,
          criteriaKeys: Array.from(new Set([...a.criteriaKeys, ...allKeys])),
        });
      } else {
        mergedMap.set(a.id, a);
      }
    }
  });

  // Auto-sync Criteria Sets to Award Categories
  const critSets = getLocalCriteriaSets(compId);
  critSets.forEach((set) => {
    const awardId = set.id === "set_default" ? "award_overall" : "award_" + set.id;
    if (!deletedIds.includes(awardId) && !deletedIds.includes(set.id)) {
      const itemKeys = set.items.map((i) => i.key || i.id);
      if (!mergedMap.has(awardId)) {
        mergedMap.set(awardId, {
          id: awardId,
          name: set.name,
          competitionId: compId,
          criteriaKeys: itemKeys,
          assignedJudgeIds: set.assignedJudgeIds,
          createdAt: set.createdAt || Date.now(),
        });
      } else {
        const existing = mergedMap.get(awardId)!;
        mergedMap.set(awardId, {
          ...existing,
          name: set.name,
          criteriaKeys: Array.from(new Set([...existing.criteriaKeys, ...itemKeys])),
        });
      }
    }
  });

  const result = Array.from(mergedMap.values());
  return result;
}

function saveLocalAwards(compId: string, awards: AwardCategory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sofea_awards_${compId}`, JSON.stringify(awards));
    notifyLocalSync();
  } catch (e) {}
}

// ─── Competitions ─────────────────────────────────────────────────────────────

export function subscribeCompetitions(
  callback: (comps: Competition[]) => void
): Unsubscribe {
  callback(getLocalCompetitions());

  function handleLocalEvent() {
    callback(getLocalCompetitions());
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function getCompetitions(): Promise<Competition[]> {
  try {
    const snap = await getDocs(collection(db, "competitions"));
    if (snap.docs.length > 0) {
      const comps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competition));
      saveLocalCompetitions(comps);
      return comps;
    }
  } catch (err) {
    console.warn("Firestore unavailable, using local competitions.");
  }
  return getLocalCompetitions();
}

export async function getCompetition(id: string): Promise<Competition | null> {
  const localList = getLocalCompetitions();
  const found = localList.find((c) => c.id === id);
  if (found) return found;

  try {
    const snap = await getDoc(doc(db, "competitions", id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Competition;
    }
  } catch (err) {}
  return null;
}

export async function createCompetition(
  data: Omit<Competition, "id" | "createdAt">
): Promise<string> {
  const compId = "comp_" + Date.now();
  const newComp: Competition = {
    id: compId,
    ...data,
    createdAt: Date.now(),
  };

  const current = getLocalCompetitions();
  saveLocalCompetitions([...current, newComp]);

  try {
    await setDoc(doc(db, "competitions", compId), newComp);
  } catch (err) {}

  return compId;
}

export async function deleteCompetition(competitionId: string): Promise<void> {
  const current = getLocalCompetitions();
  const updated = current.filter((c) => c.id !== competitionId);
  saveLocalCompetitions(updated);

  try {
    await deleteDoc(doc(db, "competitions", competitionId));
  } catch (err) {}
}

export async function updateCompetitionStatus(
  competitionId: string,
  status: Competition["status"]
): Promise<void> {
  const current = getLocalCompetitions();
  const updated = current.map((c) => (c.id === competitionId ? { ...c, status } : c));
  saveLocalCompetitions(updated);

  try {
    await updateDoc(doc(db, "competitions", competitionId), { status });
  } catch (err) {}
}

// ─── Judges Management ────────────────────────────────────────────────────────

export function subscribeJudges(
  competitionId: string,
  callback: (judges: Judge[]) => void
): Unsubscribe {
  callback(getLocalJudges(competitionId));

  function handleLocalEvent() {
    callback(getLocalJudges(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export function generateRandomPin(): string {
  const existingJudges = getAllLocalJudges();
  const usedPins = new Set<string>();
  usedPins.add("0000"); // Admin PIN
  existingJudges.forEach((j) => {
    if (j.pin) usedPins.add(j.pin);
  });

  let pin = "";
  let attempts = 0;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
  } while (usedPins.has(pin) && attempts < 10000);

  return pin;
}

function getJudgePinHistory(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("sofea_judge_pin_history");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveJudgePinHistory(history: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sofea_judge_pin_history", JSON.stringify(history));
  } catch (e) {}
}

export async function addJudge(
  competitionId: string,
  name: string,
  email: string
): Promise<Judge> {
  const judgeId = "judge_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
  const cleanEmail = email.trim().toLowerCase();

  const history = getJudgePinHistory();
  let pin = history[cleanEmail];
  if (!pin) {
    pin = generateRandomPin();
    history[cleanEmail] = pin;
    saveJudgePinHistory(history);
  }

  const newJudge: Judge = {
    id: judgeId,
    name: name.trim(),
    email: email.trim(),
    pin,
    competitionId,
    addedAt: Date.now(),
    loginCount: 0,
  };

  const current = getLocalJudges(competitionId);
  const updated = [...current, newJudge];
  saveLocalJudges(competitionId, updated);

  return newJudge;
}

export async function recordJudgeLogout(competitionId: string, judgeId: string): Promise<void> {
  const current = getLocalJudges(competitionId);
  let updated = false;
  const list = current.map((j) => {
    if (j.id === judgeId) {
      updated = true;
      return { ...j, lastLogoutAt: Date.now() };
    }
    return j;
  });
  if (updated) {
    saveLocalJudges(competitionId, list);
  }
}

export async function deleteJudge(competitionId: string, judgeId: string): Promise<void> {
  const current = getLocalJudges(competitionId);
  const updated = current.filter((j) => j.id !== judgeId);
  saveLocalJudges(competitionId, updated);

  // Clean up assignedJudgeIds in award categories
  const awards = getLocalAwards(competitionId);
  const updatedAwards = awards.map((a) => {
    if (a.assignedJudgeIds) {
      return {
        ...a,
        assignedJudgeIds: a.assignedJudgeIds.filter((id) => id !== judgeId),
      };
    }
    return a;
  });
  saveLocalAwards(competitionId, updatedAwards);
}

// ─── Criteria Management ──────────────────────────────────────────────────────

export function subscribeCriteria(
  competitionId: string,
  callback: (items: CriteriaItem[]) => void
): Unsubscribe {
  callback(getLocalCriteria(competitionId));

  function handleLocalEvent() {
    callback(getLocalCriteria(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function addCriteriaItem(
  competitionId: string,
  item: Omit<CriteriaItem, "id" | "key">
): Promise<CriteriaItem> {
  const current = getLocalCriteria(competitionId);
  const key = "c" + (current.length + 1);
  const newItem: CriteriaItem = {
    id: "crit_" + Date.now(),
    key,
    ...item,
  };

  const updated = [...current, newItem];
  saveLocalCriteria(competitionId, updated);

  return newItem;
}

export async function deleteCriteriaItem(competitionId: string, itemId: string): Promise<void> {
  const current = getLocalCriteria(competitionId);
  const updated = current.filter((c) => c.id !== itemId && c.key !== itemId);
  saveLocalCriteria(competitionId, updated);
}

// ─── Criteria Sets ─────────────────────────────────────────────────────────────

export function subscribeCriteriaSets(
  competitionId: string,
  callback: (sets: CriteriaSet[]) => void
): Unsubscribe {
  callback(getLocalCriteriaSets(competitionId));

  function handleLocalEvent() {
    callback(getLocalCriteriaSets(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function addCriteriaSet(
  competitionId: string,
  name: string
): Promise<CriteriaSet> {
  const setId = "set_" + Date.now();
  const newSet: CriteriaSet = {
    id: setId,
    name,
    competitionId,
    isActive: true,
    items: [],
    createdAt: Date.now(),
  };
  const current = getLocalCriteriaSets(competitionId);
  const updated = [...current, newSet];
  saveLocalCriteriaSets(competitionId, updated);

  // Auto-create matching AwardCategory for this Criteria Set
  const currentAwards = getLocalAwards(competitionId);
  const newAward: AwardCategory = {
    id: "award_" + setId,
    name: name,
    competitionId,
    criteriaKeys: [],
    createdAt: Date.now(),
  };
  saveLocalAwards(competitionId, [...currentAwards, newAward]);

  return newSet;
}

export async function deleteCriteriaSet(
  competitionId: string,
  setId: string
): Promise<void> {
  const current = getLocalCriteriaSets(competitionId);
  const targetSet = current.find((s) => s.id === setId);
  const updated = current.filter((s) => s.id !== setId);
  saveLocalCriteriaSets(competitionId, updated);

  const awardId = "award_" + setId;
  const deletedIds = getDeletedAwardIds(competitionId);
  if (!deletedIds.includes(awardId)) {
    saveDeletedAwardIds(competitionId, [...deletedIds, awardId]);
  }

  const currentAwards = getLocalAwards(competitionId);
  const updatedAwards = currentAwards.filter(
    (a) => a.id !== awardId && a.id !== setId && (targetSet ? a.name !== targetSet.name : true)
  );
  saveLocalAwards(competitionId, updatedAwards);
}

export async function toggleCriteriaSetActive(
  competitionId: string,
  setId: string,
  isActive: boolean
): Promise<void> {
  const current = getLocalCriteriaSets(competitionId);
  const updated = current.map((s) => (s.id === setId ? { ...s, isActive } : s));
  saveLocalCriteriaSets(competitionId, updated);
}

export async function addCriteriaItemToSet(
  competitionId: string,
  setId: string,
  item: Omit<CriteriaItem, "id" | "key">
): Promise<CriteriaItem> {
  const sets = getLocalCriteriaSets(competitionId);
  let totalCount = 0;
  sets.forEach((s) => (totalCount += s.items.length));

  const key = "c" + (totalCount + 1);
  const newItem: CriteriaItem = {
    id: "crit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    key,
    ...item,
    setId,
  };

  const updated = sets.map((s) => {
    if (s.id === setId) {
      return { ...s, items: [...s.items, newItem] };
    }
    return s;
  });

  saveLocalCriteriaSets(competitionId, updated);

  const allFlat = updated.flatMap((s) => s.items);
  saveLocalCriteria(competitionId, allFlat);

  // Sync keys to matching AwardCategory
  const currentAwards = getLocalAwards(competitionId);
  const targetSet = sets.find((s) => s.id === setId);
  const updatedAwards = currentAwards.map((a) => {
    if (a.id === "award_" + setId || (targetSet && a.name === targetSet.name)) {
      if (!a.criteriaKeys.includes(key)) {
        return { ...a, criteriaKeys: [...a.criteriaKeys, key] };
      }
    }
    return a;
  });
  saveLocalAwards(competitionId, updatedAwards);

  return newItem;
}

export async function deleteCriteriaItemFromSet(
  competitionId: string,
  setId: string,
  itemId: string
): Promise<void> {
  const sets = getLocalCriteriaSets(competitionId);
  const updated = sets.map((s) => {
    if (s.id === setId) {
      return { ...s, items: s.items.filter((i) => i.id !== itemId && i.key !== itemId) };
    }
    return s;
  });
  saveLocalCriteriaSets(competitionId, updated);

  const allFlat = updated.flatMap((s) => s.items);
  saveLocalCriteria(competitionId, allFlat);
}

export async function assignJudgesToSet(
  competitionId: string,
  setId: string,
  judgeIds: string[]
): Promise<void> {
  const current = getLocalCriteriaSets(competitionId);
  const updated = current.map((s) => (s.id === setId ? { ...s, assignedJudgeIds: judgeIds } : s));
  saveLocalCriteriaSets(competitionId, updated);
}

export async function assignJudgesToAward(
  competitionId: string,
  awardId: string,
  judgeIds: string[]
): Promise<void> {
  const current = getLocalAwards(competitionId);
  const updated = current.map((a) => (a.id === awardId ? { ...a, assignedJudgeIds: judgeIds } : a));
  saveLocalAwards(competitionId, updated);
}

// ─── Award Categories ("Ways to Win") ─────────────────────────────────────────

export function subscribeAwards(
  competitionId: string,
  callback: (awards: AwardCategory[]) => void
): Unsubscribe {
  callback(getLocalAwards(competitionId));

  function handleLocalEvent() {
    callback(getLocalAwards(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleLocalEvent);
      window.removeEventListener("storage", handleLocalEvent);
    }
  };
}

export async function addAwardCategory(
  competitionId: string,
  name: string,
  criteriaKeys: string[]
): Promise<AwardCategory> {
  const newAward: AwardCategory = {
    id: "award_" + Date.now(),
    name,
    competitionId,
    criteriaKeys,
    createdAt: Date.now(),
  };

  const current = getLocalAwards(competitionId);
  const updated = [...current, newAward];
  saveLocalAwards(competitionId, updated);

  return newAward;
}

export async function renameAwardCategory(
  competitionId: string,
  awardId: string,
  newName: string
): Promise<void> {
  const current = getLocalAwards(competitionId);
  const updated = current.map((a) => (a.id === awardId ? { ...a, name: newName } : a));
  saveLocalAwards(competitionId, updated);
}

export async function deleteAwardCategory(
  competitionId: string,
  awardId: string
): Promise<void> {
  const deletedIds = getDeletedAwardIds(competitionId);
  if (!deletedIds.includes(awardId)) {
    saveDeletedAwardIds(competitionId, [...deletedIds, awardId]);
  }

  const current = getLocalAwards(competitionId);
  const targetAward = current.find((a) => a.id === awardId);
  const updated = current.filter((a) => a.id !== awardId);
  saveLocalAwards(competitionId, updated);

  // If there's a matching criteria set, delete it as well
  if (targetAward) {
    const setId = awardId.startsWith("award_") ? awardId.replace("award_", "") : awardId;
    const sets = getLocalCriteriaSets(competitionId);
    const updatedSets = sets.filter(
      (s) => s.id !== setId && s.name !== targetAward.name
    );
    saveLocalCriteriaSets(competitionId, updatedSets);
  }
}

// ─── Participants ─────────────────────────────────────────────────────────────

export function subscribeParticipants(
  competitionId: string,
  callback: (participants: Participant[]) => void
): Unsubscribe {
  callback(getLocalParticipants(competitionId));

  function handleLocalEvent() {
    callback(getLocalParticipants(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
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

  const current = getLocalParticipants(competitionId);
  const map = new Map<string, Participant>();
  current.forEach((p) => map.set(p.id, p));
  map.set(newPart.id, newPart);
  const updated = Array.from(map.values()).sort((a, b) => a.order - b.order);

  saveLocalParticipants(competitionId, updated);
  return newPart.id;
}

export async function removeParticipant(
  competitionId: string,
  participantId: string
): Promise<void> {
  const current = getLocalParticipants(competitionId);
  const updated = current.filter((p) => p.id !== participantId);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sofea_parts_${competitionId}`, JSON.stringify(updated));
      notifyLocalSync();
    } catch (e) {}
  }
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export function subscribeScores(
  competitionId: string,
  callback: (scores: ScoreEntry[]) => void
): Unsubscribe {
  callback(getLocalScores(competitionId));

  function handleLocalEvent() {
    callback(getLocalScores(competitionId));
  }

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleLocalEvent);
    window.addEventListener("storage", handleLocalEvent);
  }

  return () => {
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
  scores: Record<string, number>,
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
}

export async function deleteScore(
  competitionId: string,
  judgeId: string,
  participantId: string
): Promise<void> {
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
}

// ─── PIN Management ───────────────────────────────────────────────────────────

export async function getPins(): Promise<Record<string, string> | null> {
  return null;
}

export async function updatePins(pins: Record<string, string>): Promise<void> {}
