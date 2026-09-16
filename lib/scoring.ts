// lib/scoring.ts
// ─── Score Calculation Utilities ─────────────────────────────────────────────

import type { CriteriaScore, WeightedScore, ScoreEntry, ParticipantResult, Participant } from "./types";

const WEIGHTS = { c1: 0.30, c2: 0.25, c3: 0.25, c4: 0.20 };

/**
 * Calculate weighted score for a single judge's score entry (out of 100).
 * Formula: (c1×30% + c2×25% + c3×25% + c4×20%) × 20
 */
export function calcWeightedScore(score: CriteriaScore): WeightedScore {
  const weighted =
    (score.c1 * WEIGHTS.c1 + score.c2 * WEIGHTS.c2 + score.c3 * WEIGHTS.c3 + score.c4 * WEIGHTS.c4) * 20;

  // Vocal percentage (C1=30%, C2=25%, sum of weights = 0.55) -> out of 100%
  const weightedVocal = (score.c1 * WEIGHTS.c1 + score.c2 * WEIGHTS.c2) * 20;
  const vocalPct = Math.round((weightedVocal / 55) * 10000) / 100;

  // Choreo percentage (C3=25%, C4=20%, sum of weights = 0.45) -> out of 100%
  const weightedChoreo = (score.c3 * WEIGHTS.c3 + score.c4 * WEIGHTS.c4) * 20;
  const choreoPct = Math.round((weightedChoreo / 45) * 10000) / 100;

  return {
    raw: score,
    weighted: Math.round(weighted * 100) / 100,
    vocalScore: vocalPct,
    choreoScore: choreoPct,
  };
}

/**
 * Average a list of numbers, returns 0 if empty.
 */
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

/**
 * Build full ParticipantResult objects from score entries for a competition.
 * Handles partial scoring (not all judges have submitted).
 */
export function buildResults(
  participants: Participant[],
  allScores: ScoreEntry[]
): ParticipantResult[] {
  const results: ParticipantResult[] = participants.map((participant) => {
    const pScores = allScores.filter(
      (s) => s.participantId === participant.id && !s.isDraft
    );

    const judgeScores: Record<string, WeightedScore> = {};
    for (const s of pScores) {
      judgeScores[s.judgeId] = calcWeightedScore(s);
    }

    const weightedList = Object.values(judgeScores).map((ws) => ws.weighted);
    const vocalList = Object.values(judgeScores).map((ws) => ws.vocalScore);
    const choreoList = Object.values(judgeScores).map((ws) => ws.choreoScore);

    return {
      participant,
      judgeScores,
      averageWeighted: avg(weightedList),
      averageVocal: avg(vocalList),
      averageChoreo: avg(choreoList),
      rank: 0,
      vocalRank: 0,
      choreoRank: 0,
    };
  });

  // Assign competition ranks with proper tie-handling (e.g. 1, 2, 2, 4)
  assignRanks(results, "averageWeighted", "rank");
  assignRanks(results, "averageVocal", "vocalRank");
  assignRanks(results, "averageChoreo", "choreoRank");

  return results;
}

function assignRanks(
  list: ParticipantResult[],
  key: "averageWeighted" | "averageVocal" | "averageChoreo",
  rankProp: "rank" | "vocalRank" | "choreoRank"
) {
  const sorted = [...list].sort((a, b) => b[key] - a[key]);
  sorted.forEach((item, index) => {
    if (index > 0 && item[key] === sorted[index - 1][key]) {
      item[rankProp] = sorted[index - 1][rankProp];
    } else {
      item[rankProp] = index + 1;
    }
  });
}
