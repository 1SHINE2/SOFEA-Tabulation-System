"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  subscribeParticipants,
  subscribeScores,
  saveScore,
  deleteScore,
  getCompetition,
  subscribeCriteriaSets,
  subscribeAwards,
} from "@/lib/db";
import {
  DEFAULT_CRITERIA,
  type Competition,
  type Participant,
  type ScoreEntry,
  type CriteriaScore,
  type CriteriaItem,
  type CriteriaSet,
  type AwardCategory,
} from "@/lib/types";
import { calcWeightedScore } from "@/lib/scoring";
import { ChevronRight, CheckCircle, Info, Lock, RotateCcw, Award } from "lucide-react";
import styles from "./page.module.css";

export default function ScoreScreen(props: {
  params: Promise<{ judgeId: string; competitionId: string; participantId: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [awards, setAwards] = useState<AwardCategory[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    async function loadComp() {
      try {
        const comp = await getCompetition(params.competitionId);
        if (comp) {
          setCompetition(comp);
          setIsLocked(comp.status === "locked" || comp.status === "completed");
        } else {
          setCompetition({
            id: params.competitionId,
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
          });
        }
      } catch (e) {}
    }
    loadComp();

    const unsubParts = subscribeParticipants(params.competitionId, (parts) => {
      const p = parts.find((x) => x.id === params.participantId);
      if (p) setParticipant(p);
    });

    const unsubScores = subscribeScores(params.competitionId, (allScores) => {
      const existing = allScores.find(
        (s) => s.judgeId === params.judgeId && s.participantId === params.participantId
      );
      if (existing) {
        const parsed: Record<string, number> = {};
        Object.keys(existing).forEach((k) => {
          if (typeof existing[k] === "number" && !["submittedAt"].includes(k)) {
            parsed[k] = existing[k] as number;
          }
        });
        setScores(parsed);
      } else {
        setScores({});
      }
    });

    const unsubCritSets = subscribeCriteriaSets(params.competitionId, (sets) => setCriteriaSets(sets));
    const unsubAwards = subscribeAwards(params.competitionId, (a) => setAwards(a));

    return () => {
      unsubParts();
      unsubScores();
      unsubCritSets();
      unsubAwards();
    };
  }, [params.competitionId, params.participantId, params.judgeId]);

  // Determine active criteria items from active sets
  const activeSets = criteriaSets.filter((s) => s.isActive);
  const activeCriteria: CriteriaItem[] =
    activeSets.length > 0
      ? activeSets.flatMap((s) => s.items)
      : (DEFAULT_CRITERIA as any);

  // Map criteria key to associated Award Categories / Sets
  const criterionAwardsMap: Record<string, string[]> = {};
  activeCriteria.forEach((c) => {
    criterionAwardsMap[c.key] = [];
  });

  awards.forEach((award) => {
    award.criteriaKeys.forEach((key) => {
      if (!criterionAwardsMap[key]) criterionAwardsMap[key] = [];
      criterionAwardsMap[key].push(award.name);
    });
  });

  const handleScoreChange = (key: string, value: number) => {
    if (isLocked) return;
    setScores((prev) => {
      const currentVal = prev[key];
      if (currentVal === value) {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSave = async (isDraft: boolean) => {
    if (isLocked) return;
    await saveScore(
      params.competitionId,
      params.judgeId,
      params.participantId,
      scores,
      isDraft
    );
    router.push(`/judge/${params.judgeId}/${params.competitionId}`);
  };

  const handleErase = async () => {
    if (isLocked) return;
    if (
      !confirm(
        "Are you sure you want to erase your score for this participant? This will reset and clear your score in the admin dashboard."
      )
    )
      return;
    await deleteScore(params.competitionId, params.judgeId, params.participantId);
    setScores({});
    router.push(`/judge/${params.judgeId}/${params.competitionId}`);
  };

  const hasAnyScore = Object.values(scores).some((v) => v !== undefined && v > 0);
  const isComplete =
    activeCriteria.length > 0 &&
    activeCriteria.every((c) => {
      const val = scores[c.key];
      return val !== undefined && val > 0;
    });

  const currentWeighted = calcWeightedScore(scores, activeCriteria).weighted;

  return (
    <div className={`container fade-in ${styles.page}`}>
      {isLocked && (
        <div className={styles.lockedAlert}>
          <Lock size={18} /> Scores are locked for this competition.
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.partMeta}>Participant #{participant?.order || "-"}</div>
        <h2 className={styles.partName}>{participant?.name || "Loading..."}</h2>
      </div>

      <div className={`card ${styles.guidelinesCard}`}>
        <button
          className={styles.guidelinesToggle}
          onClick={() => setShowGuidelines(!showGuidelines)}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={16} /> Competition Guidelines
          </span>
          <ChevronRight
            size={16}
            style={{ transform: showGuidelines ? "rotate(90deg)" : "rotate(0)" }}
          />
        </button>
        {showGuidelines && (
          <ul className={styles.guidelinesList}>
            {competition?.guidelines.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.criteriaList}>
        {activeCriteria.map((c) => {
          const val = scores[c.key];
          const associatedAwards = criterionAwardsMap[c.key] || [];
          const isOverlapping = associatedAwards.length > 1;

          return (
            <div
              key={c.key || c.id}
              className={`card ${styles.criteriaCard}`}
              style={
                isOverlapping
                  ? { borderLeft: "5px solid #8b5cf6", background: "#faf5ff" }
                  : undefined
              }
            >
              {/* Award Categories / Ways to Win Badges */}
              {associatedAwards.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                    marginBottom: "0.5rem",
                  }}
                >
                  {associatedAwards.map((awardName, idx) => (
                    <span
                      key={idx}
                      className="badge badge-primary"
                      style={{ fontSize: "0.78rem" }}
                    >
                      <Award size={12} style={{ marginRight: "0.2rem" }} /> {awardName}
                    </span>
                  ))}
                  {isOverlapping && (
                    <span
                      className="badge badge-warning"
                      style={{ fontSize: "0.78rem", background: "#fef08a", color: "#854d0e" }}
                    >
                      ⚡ Overlapping Criterion (Applies to multiple awards)
                    </span>
                  )}
                </div>
              )}

              <div className={styles.critHeader}>
                <h3 className={styles.critTitle}>{c.label}</h3>
                <span className={styles.critWeight}>{c.weight}%</span>
              </div>
              <div className={styles.scoreButtons}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    className={`${styles.scoreBtn} ${val === num ? styles.scoreBtnActive : ""}`}
                    onClick={() => handleScoreChange(c.key, num)}
                    disabled={isLocked}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {val && c.rubric ? (
                <div className={styles.rubricText}>
                  <strong>Score {val}:</strong> {c.rubric[val]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={styles.footerWrap}>
        <div className={styles.liveScore}>
          Live Weighted Score: <span>{currentWeighted.toFixed(2)}</span>
        </div>
        <div className={styles.actions}>
          {hasAnyScore && (
            <button
              className="btn btn-danger"
              onClick={handleErase}
              disabled={isLocked}
              title="Erase your score for this participant"
            >
              <RotateCcw size={16} /> Erase Score
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => handleSave(true)}
            disabled={isLocked || !hasAnyScore}
          >
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave(false)}
            disabled={!isComplete || isLocked}
          >
            <CheckCircle size={18} /> Submit Score
          </button>
        </div>
      </div>
    </div>
  );
}
