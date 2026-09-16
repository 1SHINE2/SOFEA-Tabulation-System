"use client";
import React, { useState, useEffect, use } from "react";
import { useParticipants } from "@/hooks/useParticipants";
import { useScores } from "@/hooks/useScores";
import { getCompetition, updateCompetitionStatus, addParticipant, removeParticipant } from "@/lib/db";
import { buildResults } from "@/lib/scoring";
import { JUDGES, CRITERIA, type Competition } from "@/lib/types";
import styles from "./page.module.css";
import { Users, BarChart2, Trophy, Settings, Plus, Trash2, Lock, Unlock, Eye, EyeOff, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard(props: { params: Promise<{ competitionId: string }> }) {
  const params = use(props.params);
  const competitionId = params.competitionId;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loadingComp, setLoadingComp] = useState(true);
  
  const { participants, loading: loadingP } = useParticipants(competitionId);
  const { scores, loading: loadingS } = useScores(competitionId);
  
  const [activeTab, setActiveTab] = useState("participants");

  useEffect(() => {
    async function load() {
      try {
        let comp = await getCompetition(competitionId);
        if (!comp) {
          comp = {
            id: competitionId,
            name: 'Best in Pop Sing & Dance',
            academicYear: '2025-2026',
            description: 'General Assembly Competition',
            guidelines: [],
            status: 'active',
            createdAt: Date.now()
          };
        }
        setCompetition(comp);
      } catch (err) {
        setCompetition({
          id: competitionId,
          name: 'Best in Pop Sing & Dance',
          academicYear: '2025-2026',
          description: 'General Assembly Competition',
          guidelines: [],
          status: 'active',
          createdAt: Date.now()
        });
      } finally {
        setLoadingComp(false);
      }
    }
    load();
  }, [competitionId]);

  if (loadingComp || loadingP || loadingS) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!competition) return <div className="container">Competition not found.</div>;

  const results = buildResults(participants, scores);

  return (
    <div className="container fade-in" style={{ padding: '2rem 1.5rem' }}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{competition.name}</h2>
          <p className={styles.subtitle}>
            AY {competition.academicYear} • Status: <span className={`badge ${competition.status === 'active' ? 'badge-success' : competition.status === 'locked' ? 'badge-warning' : 'badge-neutral'}`}>{competition.status.toUpperCase()}</span>
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {[
          { id: 'participants', label: 'Participants', icon: Users },
          { id: 'status', label: 'Judge Status', icon: Eye },
          { id: 'live', label: 'Live Scores', icon: Activity },
          { id: 'summary', label: 'Summary & Viz', icon: BarChart2 },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)} 
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'participants' && <TabParticipants compId={competitionId} participants={participants} />}
        {activeTab === 'status' && <TabStatus participants={participants} scores={scores} />}
        {activeTab === 'live' && <TabLive results={results} />}
        {activeTab === 'summary' && <TabSummary results={results} />}
        {activeTab === 'settings' && <TabSettings competition={competition} onUpdate={(c) => setCompetition(c)} />}
      </div>
    </div>
  );
}

// ---- Tab Components ---- //

function TabParticipants({ compId, participants }: { compId: string, participants: any[] }) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !order) return;
    await addParticipant(compId, name, parseInt(order));
    setName("");
    setOrder("");
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Participants ({participants.length})</h3>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input type="number" placeholder="Order #" value={order} onChange={e => setOrder(e.target.value)} className="input" style={{ width: '100px' }} required />
        <input type="text" placeholder="Participant Name" value={name} onChange={e => setName(e.target.value)} className="input" style={{ flex: 1 }} required />
        <button type="submit" className="btn btn-primary"><Plus size={16} /> Add</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Name</th><th>Actions</th></tr></thead>
          <tbody>
            {participants.map(p => (
              <tr key={p.id}>
                <td>{p.order}</td>
                <td>{p.name}</td>
                <td>
                  <button onClick={() => removeParticipant(compId, p.id)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-danger)' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {participants.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No participants added yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabStatus({ participants, scores }: { participants: any[], scores: any[] }) {
  const [viewMode, setViewMode] = useState<'participant' | 'matrix'>('participant');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Judge Submission & Criteria Progress</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', margin: '0.2rem 0 0 0' }}>
            Real-time status tracking for each participant and recorded criteria (C1–C4) per judge.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--gray-100)', padding: '0.25rem', borderRadius: '999px' }}>
          <button
            onClick={() => setViewMode('participant')}
            className={`btn btn-sm ${viewMode === 'participant' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '999px', fontSize: '0.82rem' }}
          >
            By Participant (Detailed Criteria)
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '999px', fontSize: '0.82rem' }}
          >
            Overview Matrix
          </button>
        </div>
      </div>

      {viewMode === 'participant' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {participants.map((p) => {
            const participantScores = scores.filter(s => s.participantId === p.id);
            const submittedCount = participantScores.filter(s => !s.isDraft).length;

            return (
              <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      #{p.order}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--blue-900)' }}>{p.name}</h4>
                  </div>
                  <span className={`badge ${submittedCount === JUDGES.length ? 'badge-success' : submittedCount > 0 ? 'badge-warning' : 'badge-neutral'}`}>
                    {submittedCount} of {JUDGES.length} Judges Submitted
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Judge</th>
                        <th style={{ textAlign: 'center' }}>C1: Songwriting (30%)</th>
                        <th style={{ textAlign: 'center' }}>C2: Vocal (25%)</th>
                        <th style={{ textAlign: 'center' }}>C3: Choreo (25%)</th>
                        <th style={{ textAlign: 'center' }}>C4: Showmanship (20%)</th>
                        <th style={{ textAlign: 'center' }}>Progress</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JUDGES.map((j) => {
                        const scoreEntry = participantScores.find(s => s.judgeId === j.id);
                        
                        const hasC1 = scoreEntry && scoreEntry.c1 > 0;
                        const hasC2 = scoreEntry && scoreEntry.c2 > 0;
                        const hasC3 = scoreEntry && scoreEntry.c3 > 0;
                        const hasC4 = scoreEntry && scoreEntry.c4 > 0;

                        const scoredCount = [hasC1, hasC2, hasC3, hasC4].filter(Boolean).length;
                        const isSubmitted = scoreEntry && !scoreEntry.isDraft;
                        const isDraft = scoreEntry && scoreEntry.isDraft;

                        return (
                          <tr key={j.id}>
                            <td style={{ fontWeight: 600 }}>{j.name}</td>
                            <td style={{ textAlign: 'center' }}>
                              {hasC1 ? <span className="badge badge-primary">{scoreEntry.c1} / 5</span> : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {hasC2 ? <span className="badge badge-primary">{scoreEntry.c2} / 5</span> : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {hasC3 ? <span className="badge badge-primary">{scoreEntry.c3} / 5</span> : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {hasC4 ? <span className="badge badge-primary">{scoreEntry.c4} / 5</span> : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{scoredCount} / 4</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isSubmitted ? (
                                <span className="badge badge-success">✓ Submitted</span>
                              ) : isDraft ? (
                                <span className="badge badge-warning">~ Draft ({scoredCount}/4)</span>
                              ) : (
                                <span className="badge badge-neutral">— Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {participants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              No participants added yet. Add participants from the "Participants" tab to start tracking progress.
            </div>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Judge</th>
                <th>Progress</th>
                {participants.map(p => (
                  <th key={p.id} title={p.name}>#{p.order}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JUDGES.map(judge => {
                const judgeScores = scores.filter(s => s.judgeId === judge.id);
                const submittedCount = judgeScores.filter(s => !s.isDraft).length;
                const total = participants.length;
                const perc = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

                return (
                  <tr key={judge.id}>
                    <td style={{ fontWeight: 600 }}>{judge.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${perc}%`, height: '100%', background: perc === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', width: '40px' }}>{submittedCount}/{total}</span>
                      </div>
                    </td>
                    {participants.map(p => {
                      const score = judgeScores.find(s => s.participantId === p.id);
                      let badge = <span className="badge badge-neutral">—</span>;
                      if (score) {
                        if (score.isDraft) badge = <span className="badge badge-warning" title="Draft">~ Draft</span>;
                        else badge = <span className="badge badge-success" title="Submitted">✓ Done</span>;
                      }
                      return <td key={p.id}>{badge}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabLive({ results }: { results: any[] }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sorted = [...results].sort((a, b) => b.averageWeighted - a.averageWeighted);

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Live Scores</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              {JUDGES.map((j, i) => <th key={j.id}>J{i+1}</th>)}
              <th>Avg</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(res => (
              <React.Fragment key={res.participant.id}>
                <tr>
                  <td style={{ fontWeight: 600 }}>#{res.participant.order} {res.participant.name}</td>
                  {JUDGES.map(j => {
                    const ws = res.judgeScores[j.id];
                    return <td key={j.id}>{ws ? ws.weighted.toFixed(2) : '—'}</td>;
                  })}
                  <td style={{ fontWeight: 'bold', color: 'var(--blue-700)' }}>{res.averageWeighted.toFixed(2)}</td>
                  <td>
                    <button className={styles.expandBtn} onClick={() => setExpandedRow(expandedRow === res.participant.id ? null : res.participant.id)}>
                      {expandedRow === res.participant.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </td>
                </tr>
                {expandedRow === res.participant.id && (
                  <tr>
                    <td colSpan={JUDGES.length + 3} style={{ padding: 0 }}>
                      <div className={styles.subTableWrap}>
                        <table style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          <thead>
                            <tr>
                              <th>Judge</th>
                              {CRITERIA.map(c => <th key={c.key}>{c.label} ({c.weight}%)</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {JUDGES.map(j => {
                              const ws = res.judgeScores[j.id];
                              if (!ws) return null;
                              return (
                                <tr key={j.id}>
                                  <td>{j.name}</td>
                                  <td>{ws.raw.c1}</td>
                                  <td>{ws.raw.c2}</td>
                                  <td>{ws.raw.c3}</td>
                                  <td>{ws.raw.c4}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {sorted.length === 0 && <tr><td colSpan={JUDGES.length + 3} style={{ textAlign: 'center' }}>No data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabSummary({ results }: { results: any[] }) {
  const barData = results.map(r => {
    const d: any = { name: `#${r.participant.order}` };
    JUDGES.forEach((j, i) => {
      d[`J${i+1}`] = r.judgeScores[j.id]?.weighted || 0;
    });
    return d;
  });

  const judgeColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇 ';
    if (rank === 2) return '🥈 ';
    if (rank === 3) return '🥉 ';
    return `${rank}. `;
  };

  const bestVocal = [...results].sort((a, b) => b.averageVocal - a.averageVocal);
  const bestChoreo = [...results].sort((a, b) => b.averageChoreo - a.averageChoreo);

  return (
    <div>
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Weighted Scores per Judge</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {JUDGES.map((j, i) => (
                  <Bar key={j.id} dataKey={`J${i+1}`} name={`Judge ${i+1}`} fill={judgeColors[i]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '380px' }}>
          <div className={styles.chartTitle}>Average Criteria Breakdown</div>
          {results.map(r => {
            let c1 = 0, c2 = 0, c3 = 0, c4 = 0, count = 0;
            JUDGES.forEach(j => {
              const ws = r.judgeScores[j.id];
              if (ws) {
                c1 += ws.raw.c1 * 0.3 * 20;
                c2 += ws.raw.c2 * 0.25 * 20;
                c3 += ws.raw.c3 * 0.25 * 20;
                c4 += ws.raw.c4 * 0.2 * 20;
                count++;
              }
            });
            if(count > 0) { c1/=count; c2/=count; c3/=count; c4/=count; }
            const pieData = [
              { name: 'C1: Thematic Songwriting (30%)', value: c1, color: '#3b82f6' },
              { name: 'C2: Musicality & Vocal Execution (25%)', value: c2, color: '#8b5cf6' },
              { name: 'C3: Choreography & Sync (25%)', value: c3, color: '#10b981' },
              { name: 'C4: Showmanship & Impact (20%)', value: c4, color: '#f59e0b' }
            ];

            return (
              <div key={r.participant.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.75rem' }}>
                <div style={{ width: 100, height: 100, flexShrink: 0 }} title="Hover chart slices to view criteria breakdown">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${Number(value).toFixed(2)} pts`, name]} 
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      />
                      <Pie 
                        data={pieData} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={20} 
                        outerRadius={42} 
                        isAnimationActive={false}
                      >
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--blue-900)', marginBottom: '0.2rem' }}>
                    #{r.participant.order} {r.participant.name}
                  </div>
                  <div style={{ color: 'var(--gray-600)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Overall Avg: <span style={{ color: 'var(--blue-600)' }}>{r.averageWeighted.toFixed(2)} / 100</span>
                  </div>
                  
                  {/* Criteria Legend Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span 
                      style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'help' }}
                      title="C1: Thematic Songwriting (30% weight)"
                    >
                      🔵 C1: {c1.toFixed(1)}
                    </span>
                    <span 
                      style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'help' }}
                      title="C2: Musicality & Pop Vocal Execution (25% weight)"
                    >
                      🟣 C2: {c2.toFixed(1)}
                    </span>
                    <span 
                      style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'help' }}
                      title="C3: Choreography & Synchronization (25% weight)"
                    >
                      🟢 C3: {c3.toFixed(1)}
                    </span>
                    <span 
                      style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'help' }}
                      title="C4: Showmanship & Audience Impact (20% weight)"
                    >
                      🟠 C4: {c4.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.rankingsGrid}>
        <div className={styles.rankingBox}>
          <div className={styles.rankingTitle}><Trophy size={18} color="var(--color-warning)" /> Overall Top Rankings</div>
          <ul className={styles.rankList}>
            {results.slice().sort((a, b) => a.rank - b.rank).map(r => (
              <li key={r.participant.id} className={`${styles.rankItem} ${r.rank <= 3 ? styles.rankHighlight : ''}`}>
                <span>{getMedal(r.rank)} {r.participant.name}</span>
                <span>{r.averageWeighted.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.rankingBox}>
          <div className={styles.rankingTitle}>Best in Vocal Execution (C1+C2)</div>
          <ul className={styles.rankList}>
            {bestVocal.map((r, i) => (
              <li key={r.participant.id} className={`${styles.rankItem} ${i === 0 ? styles.rankHighlight : ''}`}>
                <span>{i === 0 ? '🥇 ' : `${i+1}. `}{r.participant.name}</span>
                <span>{r.averageVocal.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.rankingBox}>
          <div className={styles.rankingTitle}>Best in Pop Choreo (C3+C4)</div>
          <ul className={styles.rankList}>
            {bestChoreo.map((r, i) => (
              <li key={r.participant.id} className={`${styles.rankItem} ${i === 0 ? styles.rankHighlight : ''}`}>
                <span>{i === 0 ? '🥇 ' : `${i+1}. `}{r.participant.name}</span>
                <span>{r.averageChoreo.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Full Summary Table</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Participant</th>
              <th>Avg Score (/100)</th>
              <th>Vocal (C1+C2)</th>
              <th>Choreo (C3+C4)</th>
              <th>Vocal Rank</th>
              <th>Choreo Rank</th>
            </tr>
          </thead>
          <tbody>
            {results.slice().sort((a,b) => a.rank - b.rank).map(r => (
              <tr key={r.participant.id}>
                <td style={{ fontWeight: 'bold' }}>{r.rank}</td>
                <td>{r.participant.name}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--blue-700)' }}>{r.averageWeighted.toFixed(2)}</td>
                <td>{r.averageVocal.toFixed(2)}%</td>
                <td>{r.averageChoreo.toFixed(2)}%</td>
                <td>{r.vocalRank}</td>
                <td>{r.choreoRank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabSettings({ competition, onUpdate }: { competition: Competition, onUpdate: (c: Competition) => void }) {
  const [loading, setLoading] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  async function handleToggleStatus() {
    if(!confirm(`Are you sure you want to ${competition.status === 'active' ? 'lock' : 'unlock'} this competition?`)) return;
    setLoading(true);
    const newStatus = competition.status === 'active' ? 'locked' : 'active';
    await updateCompetitionStatus(competition.id, newStatus);
    onUpdate({ ...competition, status: newStatus });
    setLoading(false);
  }

  function togglePin(id: string) {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Competition Settings</h3>
      
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ marginBottom: '0.25rem' }}>Round Status: {competition.status.toUpperCase()}</h4>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>{competition.status === 'active' ? 'Judges can submit and edit scores.' : 'Round is locked. No more submissions allowed.'}</p>
        </div>
        <button onClick={handleToggleStatus} disabled={loading} className={`btn ${competition.status === 'active' ? 'btn-danger' : 'btn-primary'}`}>
          {competition.status === 'active' ? <><Lock size={16} /> Lock Round</> : <><Unlock size={16} /> Unlock Round</>}
        </button>
      </div>

      <h4 style={{ marginBottom: '1rem' }}>Judge PINs</h4>
      <div className="table-wrap" style={{ marginBottom: '2rem' }}>
        <table>
          <thead>
            <tr><th>Judge</th><th>PIN</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {JUDGES.map(j => (
              <tr key={j.id}>
                <td>{j.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                  {visiblePins[j.id] ? j.pin : '••••'}
                </td>
                <td>
                  <button onClick={() => togglePin(j.id)} className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>
                    {visiblePins[j.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>* PINs are configured via environment variables or Firestore config.</p>
    </div>
  );
}
