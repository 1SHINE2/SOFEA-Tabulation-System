"use client";
import React, { useState, useEffect, use } from "react";
import { useParticipants } from "@/hooks/useParticipants";
import { useScores } from "@/hooks/useScores";
import {
  getCompetition,
  updateCompetitionStatus,
  addParticipant,
  removeParticipant,
  subscribeJudges,
  addJudge,
  deleteJudge,
  subscribeCriteria,
  addCriteriaItem,
  deleteCriteriaItem,
  subscribeCriteriaSets,
  addCriteriaSet,
  deleteCriteriaSet,
  toggleCriteriaSetActive,
  addCriteriaItemToSet,
  deleteCriteriaItemFromSet,
  subscribeAwards,
  addAwardCategory,
  renameAwardCategory,
  deleteAwardCategory,
  assignJudgesToAward,
} from "@/lib/db";
import { buildResults } from "@/lib/scoring";
import {
  INITIAL_JUDGES,
  type Competition,
  type Judge,
  type CriteriaItem,
  type CriteriaSet,
  type AwardCategory,
} from "@/lib/types";
import styles from "./page.module.css";
import {
  Users,
  BarChart2,
  Trophy,
  Settings,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Activity,
  UserCheck,
  FileText,
  Printer,
  Edit2,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard(props: {
  params: Promise<{ competitionId: string }>;
}) {
  const params = use(props.params);
  const competitionId = params.competitionId;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loadingComp, setLoadingComp] = useState(true);

  // Dynamic state hooks
  const { participants, loading: loadingP } = useParticipants(competitionId);
  const { scores, loading: loadingS } = useScores(competitionId);

  const [judges, setJudges] = useState<Judge[]>([]);
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [awards, setAwards] = useState<AwardCategory[]>([]);

  const [activeTab, setActiveTab] = useState("participants");

  useEffect(() => {
    async function load() {
      try {
        let comp = await getCompetition(competitionId);
        if (!comp) {
          comp = {
            id: competitionId,
            name: "General Assembly",
            academicYear: "2026-2027",
            description: "General Assembly Competition",
            guidelines: [],
            status: "active",
            createdAt: Date.now(),
          };
        }
        setCompetition(comp);
      } catch (err) {
        setCompetition({
          id: competitionId,
          name: "General Assembly",
          academicYear: "2026-2027",
          description: "General Assembly Competition",
          guidelines: [],
          status: "active",
          createdAt: Date.now(),
        });
      } finally {
        setLoadingComp(false);
      }
    }
    load();

    const unsubJudges = subscribeJudges(competitionId, (j) => setJudges(j));
    const unsubCrit = subscribeCriteria(competitionId, (c) => setCriteria(c));
    const unsubCritSets = subscribeCriteriaSets(competitionId, (cs) => setCriteriaSets(cs));
    const unsubAwards = subscribeAwards(competitionId, (a) => setAwards(a));

    return () => {
      unsubJudges();
      unsubCrit();
      unsubCritSets();
      unsubAwards();
    };
  }, [competitionId]);

  if (loadingComp || loadingP || loadingS) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", display: "flex", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!competition) return <div className="container">Competition not found.</div>;

  const results = buildResults(participants, scores, criteria, awards);

  return (
    <div className="container fade-in" style={{ padding: "2rem 1.5rem" }}>
      <div className={styles.header} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <img src="/logos/uclm-logo.webp" alt="UCLM Logo" style={{ height: "45px", width: "auto" }} />
          <img src="/logos/cte-logo.jpg" alt="CTE Logo" style={{ height: "45px", width: "auto", borderRadius: "4px" }} />
        </div>
        <div>
          <h2 className={styles.title}>{competition.name}</h2>
          <p className={styles.subtitle}>
            AY {competition.academicYear} • Status:{" "}
            <span
              className={`badge ${
                competition.status === "active"
                  ? "badge-success"
                  : competition.status === "locked"
                  ? "badge-warning"
                  : "badge-neutral"
              }`}
            >
              {competition.status.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      {/* 7-Tab Navigation Bar */}
      <div className={styles.tabs}>
        {[
          { id: "participants", label: "Participants", icon: Users },
          { id: "judges", label: "Judges", icon: UserCheck },
          { id: "criteria", label: "Criteria", icon: FileText },
          { id: "status", label: "Judge Status", icon: Eye },
          { id: "live", label: "Live Scores", icon: Activity },
          { id: "summary", label: "Summary & Viz", icon: BarChart2 },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ""}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === "participants" && (
          <TabParticipants compId={competitionId} participants={participants} />
        )}
        {activeTab === "judges" && (
          <TabJudges compId={competitionId} judges={judges} />
        )}
        {activeTab === "criteria" && (
          <TabCriteria compId={competitionId} criteriaSets={criteriaSets} criteria={criteria} />
        )}
        {activeTab === "status" && (
          <TabStatus compId={competitionId} participants={participants} scores={scores} judges={judges} criteria={criteria} criteriaSets={criteriaSets} awards={awards} />
        )}
        {activeTab === "live" && (
          <TabLive results={results} judges={judges} criteria={criteria} awards={awards} />
        )}
        {activeTab === "summary" && (
          <TabSummary compId={competitionId} competition={competition} results={results} judges={judges} criteria={criteria} awards={awards} />
        )}
        {activeTab === "settings" && (
          <TabSettings competition={competition} judges={judges} onUpdate={(c) => setCompetition(c)} />
        )}
      </div>
    </div>
  );
}

// ─── 1. Participants Tab ───────────────────────────────────────────────────────

function TabParticipants({ compId, participants }: { compId: string; participants: any[] }) {
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
      <h3 style={{ marginBottom: "1rem" }}>Participants ({participants.length})</h3>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="number"
          placeholder="Order #"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="input"
          style={{ width: "100px" }}
          required
        />
        <input
          type="text"
          placeholder="Participant / Sub-Org Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "220px" }}
          required
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} /> Add Participant
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: "bold" }}>#{p.order}</td>
                <td>{p.name}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => removeParticipant(compId, p.id)}
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem", color: "var(--color-danger)" }}
                    title="Delete Participant"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
                  No participants added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 2. Judges Tab (Google Account Registration + Permanent PIN Generator) ─────

function TabJudges({ compId, judges }: { compId: string; judges: Judge[] }) {
  const [judgeName, setJudgeName] = useState("");
  const [judgeEmail, setJudgeEmail] = useState("");
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  async function handleAddJudge(e: React.FormEvent) {
    e.preventDefault();
    if (!judgeName.trim() || !judgeEmail.trim()) return;

    await addJudge(compId, judgeName.trim(), judgeEmail.trim());
    setJudgeName("");
    setJudgeEmail("");
  }

  function togglePin(id: string) {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleDeleteJudge(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    await deleteJudge(compId, id);
  }

  return (
    <div>
      <h3 style={{ marginBottom: "0.25rem" }}>Judges Management ({judges.length})</h3>
      <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
        Register judges with their official Google/Gmail accounts. Unique permanent 4-digit PIN passcodes are generated automatically.
      </p>

      <form onSubmit={handleAddJudge} className={styles.addForm}>
        <input
          type="text"
          placeholder="Judge Full Name (e.g. Dr. Maria Santos)"
          value={judgeName}
          onChange={(e) => setJudgeName(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "220px" }}
          required
        />
        <input
          type="email"
          placeholder="Google / Gmail Account (e.g. maria.santos@gmail.com)"
          value={judgeEmail}
          onChange={(e) => setJudgeEmail(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "250px" }}
          required
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} /> Register Judge
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judge Name</th>
              <th>Registered Google Account</th>
              <th>Permanent PIN</th>
              <th>Login Audit</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {judges.map((j) => (
              <tr key={j.id}>
                <td style={{ fontWeight: 600 }}>{j.name}</td>
                <td style={{ fontSize: "0.9rem", color: "var(--blue-900)" }}>
                  {j.email || <span style={{ fontStyle: "italic", color: "var(--gray-400)" }}>Not set</span>}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
                  <span
                    style={{
                      background: "var(--blue-50)",
                      color: "var(--blue-900)",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--blue-200)",
                      fontWeight: "bold",
                    }}
                  >
                    {visiblePins[j.id] ? j.pin : "••••"}
                  </span>
                  <button
                    onClick={() => togglePin(j.id)}
                    className="btn btn-ghost"
                    style={{ padding: "0.2rem 0.4rem", marginLeft: "0.5rem" }}
                  >
                    {visiblePins[j.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </td>
                <td style={{ fontSize: "0.82rem", color: "var(--gray-600)" }}>
                  {j.lastLoginAt ? (
                    <span className="badge badge-success">
                      ✓ Active · {j.loginCount || 1} logins
                    </span>
                  ) : (
                    <span className="badge badge-neutral">○ Not logged in</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => handleDeleteJudge(j.id, j.name)}
                    className="btn btn-ghost"
                    style={{ padding: "0.4rem", color: "var(--color-danger)" }}
                    title="Delete Judge"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {judges.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                  No judges registered yet. Register a judge with their Google account above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 3. Criteria Tab (Dynamic Multi-Set Builder + Rubric System) ─────────────

function TabCriteria({
  compId,
  criteriaSets,
  criteria,
}: {
  compId: string;
  criteriaSets: CriteriaSet[];
  criteria: CriteriaItem[];
}) {
  const [showAddSet, setShowAddSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState("");
  const [rubric5, setRubric5] = useState("");
  const [rubric1, setRubric1] = useState("");

  const effectiveSets =
    criteriaSets.length > 0
      ? criteriaSets
      : [
          {
            id: "set_default",
            name: "Main Competition Criteria",
            competitionId: compId,
            isActive: true,
            items: criteria,
            createdAt: 1,
          },
        ];

  async function handleCreateSet(e: React.FormEvent) {
    e.preventDefault();
    if (!newSetName.trim()) return;
    await addCriteriaSet(compId, newSetName.trim());
    setNewSetName("");
    setShowAddSet(false);
  }

  async function handleDeleteSet(setId: string, name: string) {
    if (!confirm(`Are you sure you want to delete criteria set "${name}"?`)) return;
    await deleteCriteriaSet(compId, setId);
  }

  async function handleToggleSetActive(setId: string, currentActive: boolean) {
    await toggleCriteriaSetActive(compId, setId, !currentActive);
  }

  async function handleAddCriteriaToSet(setId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !weight) return;

    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
    const color = colors[criteria.length % colors.length];

    await addCriteriaItemToSet(compId, setId, {
      label: label.trim(),
      weight: parseFloat(weight),
      color,
      rubric: {
        5: rubric5.trim() || "Outstanding / Flawless execution.",
        4: "Strong performance with minor flaws.",
        3: "Average performance.",
        2: "Below average execution.",
        1: rubric1.trim() || "Poor / Incomplete execution.",
      },
    });

    setLabel("");
    setWeight("");
    setRubric5("");
    setRubric1("");
    setActiveSetId(null);
  }

  async function handleDeleteItemFromSet(setId: string, itemId: string, name: string) {
    if (!confirm(`Are you sure you want to delete criteria "${name}"?`)) return;
    await deleteCriteriaItemFromSet(compId, setId, itemId);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>Criteria Sets & Point Rubrics</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", margin: "0.2rem 0 0 0" }}>
            Configure criteria sets, percentage weights, and scoring rubrics for this event.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddSet(!showAddSet)}>
          <Plus size={16} /> Make Another Set of Criteria
        </button>
      </div>

      {showAddSet && (
        <form onSubmit={handleCreateSet} className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
          <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--blue-900)" }}>Create New Criteria Set</h4>
          <div style={{ display: "flex", gap: "0.8rem" }}>
            <input
              type="text"
              placeholder="Set Name (e.g. Special Awards Criteria, Set 2: Choreography)"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              className="input"
              required
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
              Create Set
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddSet(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Render Each Criteria Set */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {effectiveSets.map((set) => {
          const setTotalWeight = set.items.reduce((sum, item) => sum + (item.weight || 0), 0);

          return (
            <div key={set.id} className="card" style={{ padding: "1.5rem", border: "1.5px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <h4 style={{ margin: 0, fontSize: "1.2rem", color: "var(--blue-950)" }}>{set.name}</h4>
                  <span className={`badge ${setTotalWeight === 100 ? "badge-primary" : "badge-warning"}`}>
                    Weight: {setTotalWeight}% {setTotalWeight === 100 ? "✓ (Balanced)" : "(Target 100%)"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setActiveSetId(activeSetId === set.id ? null : set.id)}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.85rem" }}
                  >
                    <Plus size={16} /> Add Criteria to Set
                  </button>
                  {effectiveSets.length > 1 && (
                    <button
                      onClick={() => handleDeleteSet(set.id, set.name)}
                      className="btn btn-ghost"
                      style={{ color: "var(--color-danger)" }}
                      title="Delete Criteria Set"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Add item form inside set */}
              {activeSetId === set.id && (
                <form
                  onSubmit={(e) => handleAddCriteriaToSet(set.id, e)}
                  style={{ padding: "1rem", borderRadius: "8px", background: "var(--gray-50)", marginBottom: "1rem" }}
                >
                  <h5 style={{ margin: "0 0 0.8rem 0" }}>Add Criteria Item to "{set.name}"</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "1rem", marginBottom: "0.8rem" }}>
                    <input
                      type="text"
                      placeholder="Criteria Title (e.g. Vocal Technique)"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Weight (%)"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="input"
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.8rem" }}>
                    <input
                      type="text"
                      placeholder="Description for Score 5 (Outstanding)"
                      value={rubric5}
                      onChange={(e) => setRubric5(e.target.value)}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="Description for Score 1 (Needs Improvement)"
                      value={rubric1}
                      onChange={(e) => setRubric1(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="submit" className="btn btn-primary">
                      Save Item
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setActiveSetId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Items List in this Set */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {set.items.map((item) => (
                  <div
                    key={item.id || item.key}
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--color-border)",
                      borderLeft: `5px solid ${item.color || "#3b82f6"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <strong>{item.label}</strong>
                        <span className="badge badge-primary">{item.weight}% Weight</span>
                      </div>
                      <button
                        onClick={() => handleDeleteItemFromSet(set.id, item.id || item.key, item.label)}
                        className="btn btn-ghost"
                        style={{ padding: "0.3rem", color: "var(--color-danger)" }}
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {item.rubric && (
                      <div style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginTop: "0.4rem" }}>
                        Score 5: {item.rubric[5]} • Score 1: {item.rubric[1]}
                      </div>
                    )}
                  </div>
                ))}
                {set.items.length === 0 && (
                  <div style={{ fontSize: "0.88rem", color: "var(--gray-500)", fontStyle: "italic", padding: "0.5rem 0" }}>
                    No criteria items in this set yet. Click "Add Criteria to Set" above.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Judge Status Tab (Per Participant + Matrix Overview) ──────────────────

function TabStatus({
  compId,
  participants,
  scores,
  judges,
  criteria,
  criteriaSets,
  awards,
}: {
  compId: string;
  participants: any[];
  scores: any[];
  judges: Judge[];
  criteria: CriteriaItem[];
  criteriaSets: CriteriaSet[];
  awards: AwardCategory[];
}) {
  const [viewMode, setViewMode] = useState<"participant" | "matrix">("participant");
  const [appliedNotice, setAppliedNotice] = useState(false);
  const activeJudges = judges.length > 0 ? judges : INITIAL_JUDGES;

  const handleApplyAssignments = async () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sofea_tabulation_db_sync"));
      try {
        localStorage.setItem("sofea_sync_ping", Date.now().toString());
      } catch (e) {}
    }
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 3000);
  };

  return (
    <div>
      {/* Assign Judges per Award Category Card */}
      {awards.length > 0 && judges.length > 0 && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h4 style={{ margin: "0 0 0.2rem 0", color: "var(--blue-900)" }}>
                Assign Judges to Award Categories
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", margin: 0 }}>
                Select which judges are assigned to score each specific award category.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {appliedNotice && (
                <span className="badge badge-success" style={{ fontSize: "0.82rem" }}>
                  ✓ Real-time Sync Applied!
                </span>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleApplyAssignments}>
                Apply Real-Time Assignments
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {awards.map((award) => {
              const rawAssigned = award.assignedJudgeIds !== undefined
                ? award.assignedJudgeIds
                : judges.map((j) => j.id);
              const validAssigned = rawAssigned.filter((id) => judges.some((j) => j.id === id));

              return (
                <div key={award.id} style={{ background: "#ffffff", padding: "0.8rem 1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--blue-950)" }}>
                      🏆 {award.name}
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "var(--gray-500)" }}>
                      {validAssigned.length} of {judges.length} judges assigned
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {judges.map((j) => {
                      const isChecked = validAssigned.includes(j.id);
                      return (
                        <label key={j.id} style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={async () => {
                              const updated = isChecked
                                ? validAssigned.filter((id) => id !== j.id)
                                : [...validAssigned, j.id];
                              await assignJudgesToAward(compId, award.id, updated);
                            }}
                          />
                          {j.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>Judge Submission & Criteria Progress</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--gray-500)", margin: "0.2rem 0 0 0" }}>
            Real-time status tracking for each participant and recorded criteria per judge.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", background: "var(--gray-100)", padding: "0.25rem", borderRadius: "999px" }}>
          <button
            onClick={() => setViewMode("participant")}
            className={`btn btn-sm ${viewMode === "participant" ? "btn-primary" : "btn-ghost"}`}
            style={{ borderRadius: "999px", fontSize: "0.82rem" }}
          >
            By Participant (Detailed Criteria)
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`btn btn-sm ${viewMode === "matrix" ? "btn-primary" : "btn-ghost"}`}
            style={{ borderRadius: "999px", fontSize: "0.82rem" }}
          >
            Overview Matrix
          </button>
        </div>
      </div>

      {viewMode === "participant" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {participants.map((p) => {
            const participantScores = scores.filter((s) => s.participantId === p.id);
            const submittedCount = participantScores.filter((s) => !s.isDraft).length;

            return (
              <div key={p.id} className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="badge badge-primary" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                      #{p.order}
                    </span>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--blue-900)" }}>{p.name}</h4>
                  </div>
                  <span className={`badge ${submittedCount === activeJudges.length ? "badge-success" : submittedCount > 0 ? "badge-warning" : "badge-neutral"}`}>
                    {submittedCount} of {activeJudges.length} Judges Submitted
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Judge</th>
                        {criteria.map((c) => (
                          <th key={c.id || c.key} style={{ textAlign: "center" }}>
                            {c.label} ({c.weight}%)
                          </th>
                        ))}
                        <th style={{ textAlign: "center" }}>Progress</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeJudges.map((j) => {
                        const scoreEntry = participantScores.find((s) => s.judgeId === j.id);
                        const isSubmitted = scoreEntry && !scoreEntry.isDraft;
                        const isDraft = scoreEntry && scoreEntry.isDraft;

                        const scoredCount = criteria.filter((c) => scoreEntry && (scoreEntry[c.key] || 0) > 0).length;

                        return (
                          <tr key={j.id}>
                            <td style={{ fontWeight: 600 }}>{j.name}</td>
                            {criteria.map((c) => {
                              const val = scoreEntry ? scoreEntry[c.key] : undefined;
                              return (
                                <td key={c.id || c.key} style={{ textAlign: "center" }}>
                                  {val && val > 0 ? (
                                    <span className="badge badge-primary">{val} / 5</span>
                                  ) : (
                                    <span style={{ color: "var(--gray-400)" }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                {scoredCount} / {criteria.length}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {isSubmitted ? (
                                <span className="badge badge-success">✓ Submitted</span>
                              ) : isDraft ? (
                                <span className="badge badge-warning">~ Draft ({scoredCount}/{criteria.length})</span>
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
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray-500)" }}>
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
                {participants.map((p) => (
                  <th key={p.id} title={p.name}>
                    #{p.order}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeJudges.map((judge) => {
                const judgeScores = scores.filter((s) => s.judgeId === judge.id);
                const submittedCount = judgeScores.filter((s) => !s.isDraft).length;
                const total = participants.length;
                const perc = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

                return (
                  <tr key={judge.id}>
                    <td style={{ fontWeight: 600 }}>{judge.name}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ flex: 1, height: "8px", background: "var(--gray-200)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${perc}%`, height: "100%", background: perc === 100 ? "var(--color-success)" : "var(--color-primary)" }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", width: "40px" }}>
                          {submittedCount}/{total}
                        </span>
                      </div>
                    </td>
                    {participants.map((p) => {
                      const score = judgeScores.find((s) => s.participantId === p.id);
                      let badge = <span className="badge badge-neutral">—</span>;
                      if (score) {
                        if (score.isDraft) badge = <span className="badge badge-warning">~ Draft</span>;
                        else badge = <span className="badge badge-success">✓ Done</span>;
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

// ─── 5. Live Scores Tab ────────────────────────────────────────────────────────

function TabLive({
  results,
  judges,
  criteria,
  awards,
}: {
  results: any[];
  judges: Judge[];
  criteria: CriteriaItem[];
  awards: AwardCategory[];
}) {
  const [selectedAwardId, setSelectedAwardId] = useState<string>("award_overall");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const activeJudges = judges.length > 0 ? judges : INITIAL_JUDGES;

  const currentAward = awards.find((a) => a.id === selectedAwardId) || {
    id: "award_overall",
    name: "Overall Winner",
    criteriaKeys: criteria.map((c) => c.key || c.id),
  };

  const sorted = [...results].sort((a, b) => {
    if (selectedAwardId === "award_overall") {
      return b.averageWeighted - a.averageWeighted;
    }
    const bAvg = b.awardAverages?.[selectedAwardId] || 0;
    const aAvg = a.awardAverages?.[selectedAwardId] || 0;
    return bAvg - aAvg;
  });

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: "0 0 0.4rem 0" }}>Live Scores per Award Category</h3>
        <p style={{ fontSize: "0.88rem", color: "var(--gray-600)", margin: 0 }}>
          View real-time participant scores grouped by specific award categories. Click "View Breakdown" under Actions to view all criteria scores.
        </p>
      </div>

      {/* Award Category Selector Bar */}
      {awards.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {awards.map((award) => (
            <button
              key={award.id}
              onClick={() => setSelectedAwardId(award.id)}
              className={`btn ${selectedAwardId === award.id ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
            >
              🏆 {award.name}
            </button>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              {activeJudges.map((j, i) => (
                <th key={j.id} title={j.name}>
                  J{i + 1}
                </th>
              ))}
              <th style={{ color: "var(--blue-900)", fontWeight: "bold" }}>
                {currentAward.name.toUpperCase()} AVG (/100%)
              </th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((res) => {
              const categoryScoreAvg =
                selectedAwardId === "award_overall"
                  ? res.averageWeighted
                  : res.awardAverages?.[selectedAwardId] || 0;

              return (
                <React.Fragment key={res.participant.id}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      #{res.participant.order} {res.participant.name}
                    </td>
                    {activeJudges.map((j) => {
                      const ws = res.judgeScores[j.id];
                      let jScoreStr = "—";
                      if (ws) {
                        if (selectedAwardId === "award_overall") {
                          jScoreStr = `${ws.weighted.toFixed(2)}%`;
                        } else if (ws.awardScores && ws.awardScores[selectedAwardId] !== undefined) {
                          jScoreStr = `${ws.awardScores[selectedAwardId].toFixed(2)}%`;
                        }
                      }
                      return <td key={j.id}>{jScoreStr}</td>;
                    })}
                    <td style={{ fontWeight: "bold", fontSize: "1.05rem", color: "var(--blue-700)" }}>
                      {categoryScoreAvg.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={styles.expandBtn}
                        onClick={() =>
                          setExpandedRow(expandedRow === res.participant.id ? null : res.participant.id)
                        }
                      >
                        {expandedRow === res.participant.id ? "Hide Breakdown" : "View Breakdown"}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === res.participant.id && (
                    <tr>
                      <td colSpan={activeJudges.length + 3} style={{ padding: 0 }}>
                        <div className={styles.subTableWrap}>
                          <div style={{ padding: "0.5rem 0.8rem", fontWeight: 600, color: "var(--blue-900)", fontSize: "0.85rem", background: "var(--blue-50)" }}>
                            Detailed Criteria Scores — #{res.participant.order} {res.participant.name}
                          </div>
                          <table
                            style={{
                              background: "white",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <thead>
                              <tr>
                                <th>Judge Name</th>
                                {criteria.map((c) => (
                                  <th key={c.id || c.key}>
                                    {c.label} ({c.weight}%)
                                  </th>
                                ))}
                                <th>Overall Weighted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeJudges.map((j) => {
                                const ws = res.judgeScores[j.id];
                                if (!ws) return null;
                                return (
                                  <tr key={j.id}>
                                    <td>{j.name}</td>
                                    {criteria.map((c) => (
                                      <td key={c.id || c.key}>{ws.raw[c.key] || 0} / 5</td>
                                    ))}
                                    <td style={{ fontWeight: "bold" }}>{ws.weighted.toFixed(2)}%</td>
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
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={activeJudges.length + 3} style={{ textAlign: "center", padding: "2rem" }}>
                  No score data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 6. Summary & Viz Tab (Award Manager + Print / PDF Certificate Feature) ──

function TabSummary({
  compId,
  competition,
  results,
  judges,
  criteria,
  awards,
}: {
  compId: string;
  competition: Competition;
  results: any[];
  judges: Judge[];
  criteria: CriteriaItem[];
  awards: AwardCategory[];
}) {
  const [awardName, setAwardName] = useState("");
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [printAwardId, setPrintAwardId] = useState<string>("overall");

  const activeJudges = judges.length > 0 ? judges : INITIAL_JUDGES;

  const barData = results.map((r) => {
    const d: any = { name: `#${r.participant.order}` };
    activeJudges.forEach((j, i) => {
      d[`J${i + 1}`] = r.judgeScores[j.id]?.weighted || 0;
    });
    return d;
  });

  const judgeColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇 ";
    if (rank === 2) return "🥈 ";
    if (rank === 3) return "🥉 ";
    return `${rank}. `;
  };

  async function handleAddAward(e: React.FormEvent) {
    e.preventDefault();
    if (!awardName.trim() || selectedCriteria.length === 0) return;

    await addAwardCategory(compId, awardName.trim(), selectedCriteria);
    setAwardName("");
    setSelectedCriteria([]);
  }

  async function handleSaveRename(awardId: string) {
    if (!editName.trim()) return;
    await renameAwardCategory(compId, awardId, editName.trim());
    setEditingAwardId(null);
    setEditName("");
  }

  async function handleDeleteAward(awardId: string, name: string) {
    if (!confirm(`Are you sure you want to delete award category "${name}"?`)) return;
    await deleteAwardCategory(compId, awardId);
  }

  function handlePrint() {
    window.print();
  }

  // Determine which results to show in print layout
  let printTitle = "OFFICIAL OVERALL TOP RANKINGS";
  let printRows: { rank: number; name: string; scoreStr: string }[] = [];

  if (printAwardId === "overall") {
    printTitle = "OFFICIAL OVERALL TOP RANKINGS";
    printRows = results
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({
        rank: r.rank,
        name: r.participant.name,
        scoreStr: `${r.averageWeighted.toFixed(2)}%`,
      }));
  } else if (printAwardId === "vocal") {
    printTitle = "OFFICIAL RESULTS — Best in Vocal Execution";
    printRows = results
      .slice()
      .sort((a, b) => a.vocalRank - b.vocalRank)
      .map((r) => ({
        rank: r.vocalRank,
        name: r.participant.name,
        scoreStr: `${r.averageVocal.toFixed(2)}%`,
      }));
  } else if (printAwardId === "choreo") {
    printTitle = "OFFICIAL RESULTS — Best in Pop Choreography";
    printRows = results
      .slice()
      .sort((a, b) => a.choreoRank - b.choreoRank)
      .map((r) => ({
        rank: r.choreoRank,
        name: r.participant.name,
        scoreStr: `${r.averageChoreo.toFixed(2)}%`,
      }));
  } else {
    const foundAward = awards.find((a) => a.id === printAwardId);
    if (foundAward) {
      printTitle = `OFFICIAL RESULTS — ${foundAward.name}`;
      printRows = results
        .slice()
        .sort((a, b) => (a.awardRanks?.[foundAward.id] || 99) - (b.awardRanks?.[foundAward.id] || 99))
        .map((r) => ({
          rank: r.awardRanks?.[foundAward.id] || 1,
          name: r.participant.name,
          scoreStr: `${(r.awardAverages?.[foundAward.id] || 0).toFixed(2)}%`,
        }));
    }
  }

  return (
    <div>
      {/* Printable Official Certificate Sheet (hidden on screen, visible on print) */}
      <div className={styles.printSection}>
        <div className={styles.printHeader}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginBottom: "0.8rem" }}>
            <img src="/logos/uclm-logo.webp" alt="UCLM Logo" style={{ height: "65px", width: "auto" }} />
            <img src="/logos/cte-logo.jpg" alt="CTE Logo" style={{ height: "65px", width: "auto", borderRadius: "4px" }} />
          </div>
          <h2>UNIVERSITY OF CEBU LAPU-LAPU AND MANDAUE</h2>
          <p>College of Teacher Education · Society of Future Educators and Administrators</p>
          <h3 style={{ marginTop: "1rem", textTransform: "uppercase" }}>{competition.name}</h3>
          <p>Academic Year {competition.academicYear} · Official Event Tabulation</p>
          <h4 style={{ marginTop: "1rem", textDecoration: "underline", color: "#1e3a8a" }}>{printTitle}</h4>
        </div>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Participant / Sub-Org Name</th>
              <th>Official Score (%)</th>
              <th>Award Status</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((row) => (
              <tr key={row.rank + row.name}>
                <td style={{ fontWeight: "bold" }}>Rank {row.rank}</td>
                <td>{row.name}</td>
                <td style={{ fontWeight: "bold" }}>{row.scoreStr}</td>
                <td>{row.rank === 1 ? "🏆 Winner (1st Place)" : row.rank <= 3 ? "Runner Up" : "Participant"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className={styles.signatures}>
          <div className={styles.sigBlock}>
            <div className={styles.sigLine}>Head Tabulator Signature</div>
          </div>
          <div className={styles.sigBlock}>
            <div className={styles.sigLine}>Board of Judges Representative</div>
          </div>
        </div>

        {/* Printable Footer with UCLM/CTE Information and QR Code */}
        <div className={styles.printFooter}>
          <div className={styles.printFooterInfo}>
            <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: "#0f172a" }}>
              UNIVERSITY OF CEBU LAPU-LAPU AND MANDAUE
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#1e3a8a", marginBottom: "0.2rem" }}>
              College of Teacher Education
            </div>
            <div>A.C. Cortes Avenue, Looc, Mandaue City, 6014 Cebu, Philippines</div>
            <div>Telephone: 345-6666 local 6227 | Mobile: 0968-725-9797</div>
            <div>Email: uclm.cte@gmail.com | Official FB Page: The CTE SOFEA</div>
            <div>Official CTE Bulletin: https://bit.ly/uclmcte</div>
          </div>
          <div>
            <img
              src="/logos/uclm-qr.png"
              alt="UCLM CTE QR Code"
              className={styles.printFooterQr}
            />
          </div>
        </div>
      </div>

      {/* Screen Only Section */}
      <div className={styles.noPrint}>
        {/* Print / PDF Controller */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem", background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h4 style={{ margin: 0, color: "var(--blue-900)" }}>Print / Export Official PDF Ranking Certificate</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--blue-700)", margin: "0.2rem 0 0 0" }}>
                Select an award category to generate a clean, official printable document with signature lines.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <select
                className="input"
                style={{ width: "240px", background: "white" }}
                value={printAwardId}
                onChange={(e) => setPrintAwardId(e.target.value)}
              >
                <option value="overall">🏆 Overall Top Rankings</option>
                <option value="vocal">🎤 Best in Vocal Execution</option>
                <option value="choreo">💃 Best in Pop Choreography</option>
                {awards.map((a) => (
                  <option key={a.id} value={a.id}>
                    🌟 {a.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={18} /> Print / Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Visualizations */}
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Weighted Scores per Judge</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {activeJudges.map((j, i) => (
                    <Bar key={j.id} dataKey={`J${i + 1}`} name={`Judge ${i + 1}`} fill={judgeColors[i % judgeColors.length]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Criteria Breakdown */}
          <div className={styles.chartCard} style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", maxHeight: "380px" }}>
            <div className={styles.chartTitle}>Average Criteria Breakdown</div>
            {results.map((r) => {
              const pieData = criteria.map((c) => {
                let sum = 0,
                  cnt = 0;
                activeJudges.forEach((j) => {
                  const ws = r.judgeScores[j.id];
                  if (ws && ws.raw[c.key]) {
                    sum += ws.raw[c.key] * (c.weight / 100) * 20;
                    cnt++;
                  }
                });
                const avgVal = cnt > 0 ? sum / cnt : 0;
                return {
                  name: `${c.label} (${c.weight}%)`,
                  value: avgVal,
                  color: c.color,
                };
              });

              return (
                <div key={r.participant.id} style={{ display: "flex", alignItems: "center", gap: "1rem", borderBottom: "1px solid var(--gray-100)", paddingBottom: "0.75rem" }}>
                  <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value: any, name: any) => [`${Number(value).toFixed(2)} pts`, name]}
                          contentStyle={{ borderRadius: "8px", fontSize: "12px", padding: "6px 10px" }}
                        />
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={38} isAnimationActive={false}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, fontSize: "0.85rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--blue-900)", marginBottom: "0.2rem" }}>
                      #{r.participant.order} {r.participant.name}
                    </div>
                    <div style={{ color: "var(--gray-600)", fontWeight: 600 }}>
                      Overall Avg: <span style={{ color: "var(--blue-600)" }}>{r.averageWeighted.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Award Category Creator */}
        <div className="card" style={{ padding: "1.25rem", marginBottom: "2rem", background: "var(--gray-50)" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--blue-900)" }}>Add Custom Award Category</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Select which criteria are used to determine winners for this award category.
          </p>
          <form onSubmit={handleAddAward} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="text"
              placeholder="Award Title (e.g. Best in Vocal Execution)"
              value={awardName}
              onChange={(e) => setAwardName(e.target.value)}
              className="input"
              required
            />
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Select Criteria Included:
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {criteria.map((c) => (
                  <label key={c.id || c.key} style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedCriteria.includes(c.key) || selectedCriteria.includes(c.id)}
                      onChange={(e) => {
                        const targetKey = c.key || c.id;
                        if (e.target.checked) {
                          setSelectedCriteria([...selectedCriteria, targetKey]);
                        } else {
                          setSelectedCriteria(selectedCriteria.filter((k) => k !== targetKey));
                        }
                      }}
                    />
                    {c.label} ({c.weight}%)
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              <Plus size={16} /> Create Award Category
            </button>
          </form>
        </div>

        {/* Dynamic Rankings & Ways to Win Cards */}
        <div className={styles.rankingsGrid}>
          {awards.map((award) => {
            const sortedAward = results
              .slice()
              .sort((a, b) => {
                if (award.id === "award_overall") return a.rank - b.rank;
                if (award.id === "award_vocal") return a.vocalRank - b.vocalRank;
                if (award.id === "award_choreo") return a.choreoRank - b.choreoRank;
                return (a.awardRanks?.[award.id] || 99) - (b.awardRanks?.[award.id] || 99);
              });

            return (
              <div key={award.id} className={styles.rankingBox}>
                <div className={styles.rankingTitle}>
                  {editingAwardId === award.id ? (
                    <div style={{ display: "flex", gap: "0.3rem", width: "100%" }}>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: "0.2rem 0.4rem", fontSize: "0.85rem" }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveRename(award.id)}>
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>
                        {award.id === "award_overall" ? <Trophy size={18} color="var(--color-warning)" /> : "🌟 "} {award.name}
                      </span>
                      <div style={{ display: "flex", gap: "0.2rem" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "0.2rem" }}
                          onClick={() => {
                            setEditingAwardId(award.id);
                            setEditName(award.name);
                          }}
                          title="Rename Award"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "0.2rem", color: "var(--color-danger)" }}
                          onClick={() => handleDeleteAward(award.id, award.name)}
                          title="Delete Award Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <ul className={styles.rankList}>
                  {sortedAward.map((r, i) => {
                    let scorePct = 0;
                    if (award.id === "award_overall") scorePct = r.averageWeighted;
                    else if (award.id === "award_vocal") scorePct = r.averageVocal;
                    else if (award.id === "award_choreo") scorePct = r.averageChoreo;
                    else scorePct = r.awardAverages?.[award.id] || 0;

                    const isTop = i === 0 || (award.id === "award_overall" && i < 3);

                    return (
                      <li key={r.participant.id} className={`${styles.rankItem} ${isTop ? styles.rankHighlight : ""}`}>
                        <span>
                          {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}
                          {r.participant.name}
                        </span>
                        <span>{scorePct.toFixed(2)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {awards.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--gray-500)", width: "100%" }}>
              No active award categories. Create an award category above or in the Criteria tab to display rankings.
            </div>
          )}
        </div>

        {/* Full Summary Table */}
        <h3 style={{ marginBottom: "1rem", marginTop: "2rem" }}>Full Summary Table</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                <th>Overall Avg (/100%)</th>
                {awards.length > 0 ? (
                  awards.map((a) => <th key={a.id}>{a.name}</th>)
                ) : (
                  <>
                    <th>Vocal (C1+C2)</th>
                    <th>Choreo (C3+C4)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((r) => (
                  <tr key={r.participant.id}>
                    <td style={{ fontWeight: "bold" }}>
                      {getMedal(r.rank)} Rank {r.rank}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.participant.name}</td>
                    <td style={{ fontWeight: "bold", color: "var(--blue-600)" }}>{r.averageWeighted.toFixed(2)}%</td>
                    {awards.length > 0 ? (
                      awards.map((a) => (
                        <td key={a.id} style={{ fontWeight: 500 }}>
                          {(r.awardAverages?.[a.id] || 0).toFixed(2)}%
                        </td>
                      ))
                    ) : (
                      <>
                        <td>{r.averageVocal.toFixed(2)}%</td>
                        <td>{r.averageChoreo.toFixed(2)}%</td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Settings Tab ──────────────────────────────────────────────────────────

function TabSettings({
  competition,
  judges,
  onUpdate,
}: {
  competition: Competition;
  judges: Judge[];
  onUpdate: (c: Competition) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  async function handleToggleStatus() {
    if (!confirm(`Are you sure you want to ${competition.status === "active" ? "lock" : "unlock"} this competition?`)) return;
    setLoading(true);
    const newStatus = competition.status === "active" ? "locked" : "active";
    await updateCompetitionStatus(competition.id, newStatus);
    onUpdate({ ...competition, status: newStatus });
    setLoading(false);
  }

  function togglePin(id: string) {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const activeJudges = judges.length > 0 ? judges : INITIAL_JUDGES;

  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>Competition Settings</h3>

      <div className="card" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h4 style={{ marginBottom: "0.25rem" }}>Round Status: {competition.status.toUpperCase()}</h4>
          <p style={{ fontSize: "0.9rem", margin: 0 }}>
            {competition.status === "active"
              ? "Judges can submit and edit scores."
              : "Round is locked. No more submissions allowed."}
          </p>
        </div>
        <button onClick={handleToggleStatus} disabled={loading} className={`btn ${competition.status === "active" ? "btn-danger" : "btn-primary"}`}>
          {competition.status === "active" ? (
            <>
              <Lock size={16} /> Lock Round
            </>
          ) : (
            <>
              <Unlock size={16} /> Unlock Round
            </>
          )}
        </button>
      </div>

      <h4 style={{ marginBottom: "1rem" }}>Judge PINs Overview</h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judge Name</th>
              <th>PIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeJudges.map((j) => (
              <tr key={j.id}>
                <td>{j.name}</td>
                <td style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{visiblePins[j.id] ? j.pin : "••••"}</td>
                <td>
                  <button onClick={() => togglePin(j.id)} className="btn btn-ghost" style={{ padding: "0.3rem 0.5rem" }}>
                    {visiblePins[j.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
