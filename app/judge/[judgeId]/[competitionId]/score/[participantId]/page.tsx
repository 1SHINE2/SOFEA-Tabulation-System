"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeParticipants, subscribeScores, saveScore, deleteScore, getCompetition } from "@/lib/db";
import { CRITERIA, type Competition, type Participant, type ScoreEntry, type CriteriaScore } from "@/lib/types";
import { calcWeightedScore } from "@/lib/scoring";
import { ChevronRight, CheckCircle, Info, Lock, RotateCcw } from "lucide-react";
import styles from "./page.module.css";

export default function ScoreScreen(props: { params: Promise<{ judgeId: string; competitionId: string; participantId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [scores, setScores] = useState<Partial<CriteriaScore>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    async function loadComp() {
      try {
        const comp = await getCompetition(params.competitionId);
        if (comp) {
          setCompetition(comp);
          setIsLocked(comp.status === 'locked' || comp.status === 'completed');
        } else {
          setCompetition({
            id: params.competitionId,
            name: 'Best in Pop Sing & Dance',
            academicYear: '2026-2027',
            description: 'SOFEA Competition',
            guidelines: [
              'Each performance must strictly last between 3 to 4 minutes.',
              'Performances that fall short of 3 minutes or exceed 4 minutes will incur a point deduction.',
              'The performance must feature an original song composition in the Pop genre, advocate for SDG 4 (Quality Education), and anchor on the theme: Arete 2026! Actualizing Responsive Ethics Toward Excellence in Education.'
            ],
            status: 'active',
            createdAt: Date.now()
          });
        }
      } catch(e) {}
    }
    loadComp();

    const unsubParts = subscribeParticipants(params.competitionId, (parts) => {
      const p = parts.find(x => x.id === params.participantId);
      if (p) setParticipant(p);
    });

    const unsubScores = subscribeScores(params.competitionId, (allScores) => {
      const existing = allScores.find(s => s.judgeId === params.judgeId && s.participantId === params.participantId);
      if (existing) {
        setScores({
          c1: existing.c1,
          c2: existing.c2,
          c3: existing.c3,
          c4: existing.c4
        });
      } else {
        setScores({});
      }
    });

    return () => {
      unsubParts();
      unsubScores();
    };
  }, [params.competitionId, params.participantId, params.judgeId]);

  const handleScoreChange = (key: keyof CriteriaScore, value: number) => {
    if (isLocked) return;
    setScores(prev => {
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
    const fullScores = {
      c1: scores.c1 || 0,
      c2: scores.c2 || 0,
      c3: scores.c3 || 0,
      c4: scores.c4 || 0,
    };
    await saveScore(params.competitionId, params.judgeId, params.participantId, fullScores, isDraft);
    router.push(`/judge/${params.judgeId}/${params.competitionId}`);
  };

  const handleErase = async () => {
    if (isLocked) return;
    if (!confirm("Are you sure you want to erase your score for this participant? This will clear your submission in the admin dashboard.")) return;
    await deleteScore(params.competitionId, params.judgeId, params.participantId);
    setScores({});
    router.push(`/judge/${params.judgeId}/${params.competitionId}`);
  };

  const hasAnyScore = Object.values(scores).some(v => v !== undefined && v > 0);
  const isComplete = CRITERIA.every(c => {
    const val = scores[c.key as keyof CriteriaScore];
    return val !== undefined && val > 0;
  });
  
  const dummyScore: CriteriaScore = {
    c1: scores.c1 || 0,
    c2: scores.c2 || 0,
    c3: scores.c3 || 0,
    c4: scores.c4 || 0,
  };
  const currentWeighted = calcWeightedScore(dummyScore).weighted;

  return (
    <div className={`container fade-in ${styles.page}`}>
      {isLocked && (
        <div className={styles.lockedAlert}>
          <Lock size={18} /> Scores are locked for this competition.
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.partMeta}>Participant #{participant?.order || '-'}</div>
        <h2 className={styles.partName}>{participant?.name || 'Loading...'}</h2>
      </div>

      <div className={`card ${styles.guidelinesCard}`}>
        <button 
          className={styles.guidelinesToggle} 
          onClick={() => setShowGuidelines(!showGuidelines)}
        >
          <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Info size={16} /> Competition Guidelines
          </span>
          <ChevronRight size={16} style={{ transform: showGuidelines ? 'rotate(90deg)' : 'rotate(0)' }} />
        </button>
        {showGuidelines && (
          <ul className={styles.guidelinesList}>
            {competition?.guidelines.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        )}
      </div>

      <div className={styles.criteriaList}>
        {CRITERIA.map(c => {
          const val = scores[c.key as keyof CriteriaScore];
          return (
            <div key={c.key} className={`card ${styles.criteriaCard}`}>
              <div className={styles.critHeader}>
                <h3 className={styles.critTitle}>{c.label}</h3>
                <span className={styles.critWeight}>{c.weight}%</span>
              </div>
              <div className={styles.scoreButtons}>
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    className={`${styles.scoreBtn} ${val === num ? styles.scoreBtnActive : ''}`}
                    onClick={() => handleScoreChange(c.key as keyof CriteriaScore, num)}
                    disabled={isLocked}
                  >
                    {num}
                  </button>
                ))}
              </div>
              {val ? (
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
