"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCompetitions } from "@/lib/db";
import type { Competition } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import styles from "./page.module.css";

const fallbackCompetition: Competition = {
  id: 'comp_1',
  name: 'General Assembly',
  academicYear: '2026-2027',
  description: 'General Assembly Competition',
  guidelines: [
    'Each performance must strictly last between 3 to 4 minutes.',
    'Performances that fall short of 3 minutes or exceed 4 minutes will incur a point deduction.',
    'The performance must feature an original song composition in the Pop genre, advocate for SDG 4 (Quality Education), and anchor on the theme: Arete 2026! Actualizing Responsive Ethics Toward Excellence in Education.',
    'Participants are allowed to use AI tools to assist with songwriting. However, they must transparently declare this to the organizers prior to the event.',
    'All vocals and choreography must be performed live during the event. Lip-syncing is strictly prohibited.'
  ],
  status: 'active',
  createdAt: Date.now()
};

export default function JudgeHome(props: { params: Promise<{ judgeId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComps() {
      try {
        const comps = await getCompetitions();
        if (comps.length > 0) {
          setCompetitions(comps);
        } else {
          setCompetitions([fallbackCompetition]);
        }
      } catch (err) {
        console.error("Failed to load competitions, using fallback.", err);
        setCompetitions([fallbackCompetition]);
      } finally {
        setLoading(false);
      }
    }
    fetchComps();
  }, []);

  return (
    <div className={`container fade-in ${styles.page}`}>
      <h2 className={styles.title}>Assigned Competitions</h2>
      
      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" />
          <p>Loading competitions...</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {competitions.map((comp) => (
            <div 
              key={comp.id} 
              className={`card ${styles.compCard}`}
              onClick={() => router.push(`/judge/${params.judgeId}/${comp.id}`)}
            >
              <div className={styles.compInfo}>
                <h3>{comp.name}</h3>
                <p className={styles.year}>{comp.academicYear}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`badge ${comp.status === 'active' ? 'badge-success' : comp.status === 'locked' ? 'badge-danger' : 'badge-neutral'}`}>
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
