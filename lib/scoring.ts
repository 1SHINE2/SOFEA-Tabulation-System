// lib/scoring.ts
// ─── Score Calculation Utilities ─────────────────────────────────────────────

import type {
  CriteriaScore,
  WeightedScore,
  ScoreEntry,
  ParticipantResult,
  Participant,
  CriteriaItem,
  AwardCategory,
} from "./types";
import { DEFAULT_CRITERIA } from "./types";

/**
 * Calculate weighted score for a single judge's score entry (out of 100).
 */
export function calcWeightedScore(
  score: CriteriaScore,
  criteria: CriteriaItem[] = DEFAULT_CRITERIA as any
): WeightedScore {
  let totalWeighted = 0;
  let totalWeightSum = 0;

  for (const c of criteria) {
    const rawVal = score[c.key] || 0;
    const w = c.weight / 100;
    totalWeighted += rawVal * w * 20;
    totalWeightSum += c.weight;
  }

  // Fallback default vocal & choreo for backwards compatibility
  const c1 = score.c1 || 0;
  const c2 = score.c2 || 0;
  const c3 = score.c3 || 0;
  const c4 = score.c4 || 0;

  const vocalScore = Math.round((((c1 * 0.3 + c2 * 0.25) * 20) / 55) * 10000) / 100;
  const choreoScore = Math.round((((c3 * 0.25 + c4 * 0.2) * 20) / 45) * 10000) / 100;

  return {
    raw: score,
    weighted: Math.round(totalWeighted * 100) / 100,
    vocalScore,
    choreoScore,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

/**
 * Build ParticipantResult objects from score entries for a competition.
 * Supports dynamic criteria lists and custom "Ways to Win" award categories.
 */
export function buildResults(
  participants: Participant[],
  allScores: ScoreEntry[],
  criteriaList: CriteriaItem[] = DEFAULT_CRITERIA as any,
  awardList: AwardCategory[] = []
): ParticipantResult[] {
  const results: ParticipantResult[] = participants.map((participant) => {
    const pScores = allScores.filter(
      (s) => s.participantId === participant.id && !s.isDraft
    );

    const judgeScores: Record<string, WeightedScore> = {};
    const awardJudgeScores: Record<string, number[]> = {};

    awardList.forEach((a) => {
      awardJudgeScores[a.id] = [];
    });

    for (const s of pScores) {
      const ws = calcWeightedScore(s, criteriaList);
      judgeScores[s.judgeId] = ws;

      // Calculate score per award category for this judge
      awardList.forEach((award) => {
        let awardPointsSum = 0;
        let awardWeightSum = 0;

        criteriaList.forEach((c) => {
          if (award.criteriaKeys.includes(c.key) || award.criteriaKeys.includes(c.id)) {
            const rawVal = s[c.key] || 0;
            const w = c.weight / 100;
            awardPointsSum += rawVal * w * 20;
            awardWeightSum += c.weight;
          }
        });

        const awardPct =
          awardWeightSum > 0
            ? Math.round(((awardPointsSum / awardWeightSum) * 100) * 100) / 100
            : 0;

        if (!ws.awardScores) ws.awardScores = {};
        ws.awardScores[award.id] = awardPct;
        awardJudgeScores[award.id].push(awardPct);
      });
    }

    const weightedList = Object.values(judgeScores).map((ws) => ws.weighted);
    const vocalList = Object.values(judgeScores).map((ws) => ws.vocalScore);
    const choreoList = Object.values(judgeScores).map((ws) => ws.choreoScore);

    const awardAverages: Record<string, number> = {};
    awardList.forEach((a) => {
      awardAverages[a.id] = avg(awardJudgeScores[a.id]);
    });

    return {
      participant,
      judgeScores,
      averageWeighted: avg(weightedList),
      averageVocal: avg(vocalList),
      averageChoreo: avg(choreoList),
      awardAverages,
      rank: 0,
      vocalRank: 0,
      choreoRank: 0,
      awardRanks: {},
    };
  });

  // Assign competition ranks with proper tie-handling
  assignRanks(results, (r) => r.averageWeighted, (r, val) => { r.rank = val; });
  assignRanks(results, (r) => r.averageVocal, (r, val) => { r.vocalRank = val; });
  assignRanks(results, (r) => r.averageChoreo, (r, val) => { r.choreoRank = val; });

  // Assign ranks for custom award categories
  awardList.forEach((award) => {
    assignRanks(
      results,
      (r) => r.awardAverages?.[award.id] || 0,
      (r, val) => {
        if (!r.awardRanks) r.awardRanks = {};
        r.awardRanks[award.id] = val;
      }
    );
  });

  return results;
}

function assignRanks(
  list: ParticipantResult[],
  getValue: (r: ParticipantResult) => number,
  setRank: (r: ParticipantResult, rank: number) => void
) {
  const sorted = [...list].sort((a, b) => getValue(b) - getValue(a));
  sorted.forEach((item, index) => {
    if (index > 0 && getValue(item) === getValue(sorted[index - 1])) {
      setRank(item, getValue(sorted[index - 1]) ? getRankValue(sorted[index - 1], list, getValue) : index + 1);
    } else {
      setRank(item, index + 1);
    }
  });
}

function getRankValue(
  target: ParticipantResult,
  list: ParticipantResult[],
  getValue: (r: ParticipantResult) => number
): number {
  const sorted = [...list].sort((a, b) => getValue(b) - getValue(a));
  const idx = sorted.findIndex((x) => x.participant.id === target.participant.id);
  return idx >= 0 ? idx + 1 : 1;
}
