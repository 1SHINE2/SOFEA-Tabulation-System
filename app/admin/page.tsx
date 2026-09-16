"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCompetitions } from "@/lib/db";
import type { Competition } from "@/lib/types";
import styles from "./page.module.css";
import { Trophy } from "lucide-react";

export default function AdminHome() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCompetitions();
        if (data.length > 0) {
          setCompetitions(data);
        } else {
          setCompetitions([{
            id: 'comp_1',
            name: 'Best in Pop Sing & Dance',
            academicYear: '2026-2027',
            description: 'SOFEA Competition',
            guidelines: [],
            status: 'active',
            createdAt: Date.now()
          }]);
        }
      } catch (err) {
        setCompetitions([{
          id: 'comp_1',
          name: 'Best in Pop Sing & Dance',
          academicYear: '2026-2027',
          description: 'SOFEA Competition',
          guidelines: [],
          status: 'active',
          createdAt: Date.now()
        }]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`container fade-in`} style={{ padding: '2rem 1.5rem' }}>
      <div className={styles.hero}>
        <h2>Competitions</h2>
        <p>Manage tabulation for your active events.</p>
      </div>

      <div className={styles.grid}>
        {competitions.map(c => (
          <Link key={c.id} href={`/admin/${c.id}`} className={`card ${styles.compCard}`}>
            <div className={styles.compHeader}>
              <Trophy size={24} color="var(--blue-500)" />
              <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'locked' ? 'badge-warning' : 'badge-neutral'}`}>
                {c.status.toUpperCase()}
              </span>
            </div>
            <h3>{c.name}</h3>
            <div className={styles.year}>AY {c.academicYear}</div>
            <p style={{ fontSize: '0.9rem', flex: 1 }}>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
