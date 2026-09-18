"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeParticipants, subscribeScores, subscribeCompetition } from "@/lib/db";
import type { Participant, ScoreEntry, Competition } from "@/lib/types";
import { ChevronRight, CheckCircle, Clock } from "lucide-react";
import styles from "./page.module.css";

export default function CompetitionParticipants(props: { params: Promise<{ judgeId: string; competitionId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubComp = subscribeCompetition(params.competitionId, (comp) => {
      setCompetition(comp);
    });

    const unsubParts = subscribeParticipants(params.competitionId, (parts) => {
      setParticipants(parts);
      setLoading(false);
    });

    const unsubScores = subscribeScores(params.competitionId, (allScores) => {
      // Only keep scores from this judge
      const myScores = allScores.filter(s => s.judgeId === params.judgeId);
      setScores(myScores);
    });

    return () => {
      unsubComp();
      unsubParts();
      unsubScores();
    };
  }, [params.competitionId, params.judgeId]);

  const submittedCount = scores.filter(s => !s.isDraft).length;
  const totalCount = participants.length;

  return (
    <div className={`container fade-in ${styles.page}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{competition?.name || "Competition"}</h2>
        <p className={styles.progress}>
          {submittedCount} of {totalCount} submitted
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" />
        </div>
      ) : participants.length === 0 ? (
        <div className={styles.empty}>No participants found.</div>
      ) : (
        <div className={styles.list}>
          {participants.map((p) => {
            const score = scores.find(s => s.participantId === p.id);
            const isDraft = score?.isDraft === true;
            const isSubmitted = score && !isDraft;

            let badgeClass = "badge-neutral";
            let badgeText = "Not Started";
            let Icon = Clock;
            if (isSubmitted) {
              badgeClass = "badge-success";
              badgeText = "Submitted";
              Icon = CheckCircle;
            } else if (isDraft) {
              badgeClass = "badge-warning";
              badgeText = "Draft Saved";
            }

            return (
              <div key={p.id} className={`card ${styles.partCard}`}>
                <div className={styles.partInfo}>
                  <div className={styles.partHeader}>
                    <span className={styles.partOrder}>#{p.order}</span>
                    <h3 className={styles.partName}>{p.name}</h3>
                  </div>
                  <span className={`badge ${badgeClass} ${styles.badge}`}>
                    <Icon size={12} /> {badgeText}
                  </span>
                </div>
                <button 
                  className={`btn ${isSubmitted ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => router.push(`/judge/${params.judgeId}/${params.competitionId}/score/${p.id}`)}
                >
                  {isSubmitted ? 'Edit' : 'Score'} <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
