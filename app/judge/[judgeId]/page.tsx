"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCompetitions, subscribeCompetitions, subscribeAwards } from "@/lib/db";
import type { AwardCategory, Competition } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import styles from "./page.module.css";

const fallbackCompetition: Competition = {
  id: "comp_1",
  name: "General Assembly",
  academicYear: "2026-2027",
  description: "General Assembly Competition",
  guidelines: [
    "Each performance must strictly last between 3 to 4 minutes.",
    "Performances that fall short of 3 minutes or exceed 4 minutes will incur a point deduction.",
    "The performance must feature an original song composition in Pop genre.",
  ],
  status: "active",
  createdAt: Date.now(),
};

export default function JudgeHome(props: { params: Promise<{ judgeId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compAwardsMap, setCompAwardsMap] = useState<Record<string, AwardCategory[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompetitions();
    const unsub = subscribeCompetitions((comps) => {
      if (comps.length > 0) {
        setCompetitions(comps);
      } else {
        setCompetitions([fallbackCompetition]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    competitions.forEach((comp) => {
      const unsub = subscribeAwards(comp.id, (awards) => {
        setCompAwardsMap((prev) => ({ ...prev, [comp.id]: awards }));
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [competitions]);

  const assignedCompetitions = competitions.filter((comp) => {
    const awards = compAwardsMap[comp.id];
    if (!awards || awards.length === 0) return true;
    return awards.some((award) => {
      if (award.assignedJudgeIds === undefined) return true;
      return award.assignedJudgeIds.includes(params.judgeId);
    });
  });

  return (
    <div className={`container fade-in ${styles.page}`}>
      <h2 className={styles.title}>Assigned Competitions</h2>

      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" />
          <p>Loading competitions...</p>
        </div>
      ) : assignedCompetitions.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center", background: "#f8fafc" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--blue-900)" }}>No Active Assignments</h4>
          <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "0.9rem" }}>
            You are currently not assigned to score any criteria or award categories for this event.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {assignedCompetitions.map((comp) => (
            <div
              key={comp.id}
              className={`card ${styles.compCard}`}
              onClick={() => router.push(`/judge/${params.judgeId}/${comp.id}`)}
            >
              <div className={styles.compInfo}>
                <h3>{comp.name}</h3>
                <p className={styles.year}>{comp.academicYear}</p>
                <div style={{ marginTop: "0.5rem" }}>
                  <span
                    className={`badge ${
                      comp.status === "active"
                        ? "badge-success"
                        : comp.status === "locked"
                        ? "badge-danger"
                        : "badge-neutral"
                    }`}
                  >
                    {comp.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronRight className={styles.chevron} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
