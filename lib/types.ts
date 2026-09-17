// lib/types.ts
// ─── Data Models ──────────────────────────────────────────────────────────────

export type UserRole = "judge" | "admin";

export interface AuditLogEntry {
  type: "login" | "logout";
  timestamp: number;
}

export interface Judge {
  id: string; // e.g. "judge_172648..."
  name: string;
  email?: string; // Google/Gmail account for verification
  pin: string;
  competitionId?: string;
  addedAt?: number;
  lastLoginAt?: number;
  lastLogoutAt?: number;
  loginCount?: number;
  auditHistory?: AuditLogEntry[];
  deviceToken?: string;
}

export interface Competition {
  id: string;
  name: string;
  academicYear: string;
  description: string;
  guidelines: string[];
  status: "active" | "locked" | "completed";
  createdAt: number;
}

export interface Participant {
  id: string;
  name: string; // Sub-org name
  order: number;
  addedAt: number;
}

export interface CriteriaItem {
  id: string; // e.g. "c1", "c2", "crit_123"
  key: string;
  label: string;
  weight: number; // percentage (e.g. 30)
  color: string;
  rubric: Record<number, string>; // score 1-5 -> description
  setId?: string;
}

export interface CriteriaSet {
  id: string;
  name: string;
  competitionId: string;
  isActive: boolean;
  assignedJudgeIds?: string[]; // IDs of assigned judges (if undefined/empty, all judges score)
  items: CriteriaItem[];
  createdAt: number;
}

export interface AwardCategory {
  id: string;
  name: string;
  competitionId: string;
  criteriaKeys: string[]; // array of criteria keys included e.g. ["c1", "c2"]
  assignedJudgeIds?: string[]; // IDs of judges assigned to score this award
  createdAt: number;
}

export interface CriteriaScore {
  c1?: number;
  c2?: number;
  c3?: number;
  c4?: number;
  [key: string]: number | undefined;
}

export type ScoreEntry = {
  judgeId: string;
  participantId: string;
  competitionId: string;
  isDraft: boolean;
  submittedAt: number | null;
  c1?: number;
  c2?: number;
  c3?: number;
  c4?: number;
  [key: string]: any;
};

// ─── Computed/Derived Types ────────────────────────────────────────────────────

export interface WeightedScore {
  raw: CriteriaScore;
  weighted: number; // out of 100
  vocalScore: number; // percentage out of 100%
  choreoScore: number; // percentage out of 100%
  awardScores?: Record<string, number>; // awardId -> score %
}

export interface ParticipantResult {
  participant: Participant;
  judgeScores: Record<string, WeightedScore>; // judgeId -> score
  averageWeighted: number; // avg across all judges, out of 100
  averageVocal: number;
  averageChoreo: number;
  awardAverages?: Record<string, number>; // awardId -> avg score
  rank: number;
  vocalRank: number;
  choreoRank: number;
  awardRanks?: Record<string, number>; // awardId -> rank
}

// ─── Criteria Metadata ────────────────────────────────────────────────────────

export interface CriteriaInfo {
  key: string;
  label: string;
  weight: number; // percentage
  color: string;
  rubric: Record<number, string>; // score 1-5 -> description
}

export const DEFAULT_CRITERIA: CriteriaInfo[] = [
  {
    key: "c1",
    label: "Thematic Songwriting",
    weight: 30,
    color: "#3b82f6",
    rubric: {
      5: "Flawlessly weaves both SDG 4 and the 'Arete 2026' theme into the lyrics. The message of educational excellence and ethics is powerful, clear, and highly inspiring.",
      4: "Strong integration of both themes, but slightly favors one over the other. The core message remains clear and relevant.",
      3: "Touches on the themes, but the message feels superficial, forced, or lacks depth.",
      2: "Barely mentions SDG 4 or the Arete theme. The educational message is unclear.",
      1: "Completely ignores the required themes and SDG alignment.",
    },
  },
  {
    key: "c2",
    label: "Musicality & Pop Vocal Execution",
    weight: 25,
    color: "#8b5cf6",
    rubric: {
      5: "Exceptionally catchy Pop track. Vocal projection is clear, energetic, and perfectly blended. Lyrics are easy to understand.",
      4: "Catchy composition with strong vocals. Only minor issues in harmony, pitch, or lyrical clarity.",
      3: "Average composition. Vocals are decent but lack consistent energy or blending.",
      2: "Weak composition. Vocals are hard to hear, or the style does not fit the Pop genre well.",
      1: "Poor vocal execution. Inaudible lyrics and no musical harmony.",
    },
  },
  {
    key: "c3",
    label: "Choreography & Synchronization",
    weight: 25,
    color: "#10b981",
    rubric: {
      5: "Highly energetic, creative Pop choreography. The group is perfectly synchronized, demonstrating flawless teamwork and fluid transitions.",
      4: "Good choreography and energy. Mostly synchronized with only minor visible lapses in timing.",
      3: "Average dancing. Noticeable timing issues, or the choreography feels a bit repetitive and safe.",
      2: "Poor coordination. Dancers are frequently out of sync, and the routine feels disconnected from the music.",
      1: "Chaotic execution. No visible synchronization or effort to dance as a unified group.",
    },
  },
  {
    key: "c4",
    label: "Showmanship & Audience Impact",
    weight: 20,
    color: "#f59e0b",
    rubric: {
      5: "Electrifying stage presence. The group exudes confidence, fully hyping up the crowd and delivering an unforgettable, 'concert-level' performance.",
      4: "Strong stage presence. The group keeps the audience entertained and engaged throughout the routine.",
      3: "Moderate presence. The performance is okay but loses the audience's attention at certain points.",
      2: "Low energy. The group looks nervous or fails to connect with the audience entirely.",
      1: "Flat, lifeless performance with zero audience engagement.",
    },
  },
];

export const CRITERIA = DEFAULT_CRITERIA;

// ─── Initial Default Judges (for seed fallback) ────────────────────────────────

export const INITIAL_JUDGES: Judge[] = [];

export const JUDGES = INITIAL_JUDGES;

export const ADMIN_PIN = process.env.NEXT_PUBLIC_PIN_ADMIN || "0000";
