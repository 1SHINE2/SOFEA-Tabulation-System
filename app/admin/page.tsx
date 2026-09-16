"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCompetitions, createCompetition, deleteCompetition } from "@/lib/db";
import type { Competition } from "@/lib/types";
import styles from "./page.module.css";
import { Trophy, Plus, Trash2, X } from "lucide-react";

export default function AdminHome() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [description, setDescription] = useState("");
  const [guidelinesText, setGuidelinesText] = useState("");

  useEffect(() => {
    loadComps();
  }, []);

  async function loadComps() {
    try {
      const data = await getCompetitions();
      if (data.length > 0) {
        setCompetitions(data);
      } else {
        const defaultComp: Competition = {
          id: "comp_1",
          name: "Best in Pop Sing & Dance",
          academicYear: "2026-2027",
          description: "SOFEA Competition",
          guidelines: [
            "Performance must strictly last 3 to 4 minutes.",
            "All vocals and choreography must be performed live.",
          ],
          status: "active",
          createdAt: Date.now(),
        };
        setCompetitions([defaultComp]);
      }
    } catch (err) {
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCompetition(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const guidelines = guidelinesText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    await createCompetition({
      name: name.trim(),
      academicYear: academicYear.trim() || "2026-2027",
      description: description.trim() || "SOFEA Competition",
      guidelines,
      status: "active",
    });

    setName("");
    setDescription("");
    setGuidelinesText("");
    setShowModal(false);
    loadComps();
  }

  async function handleDeleteCompetition(e: React.MouseEvent, compId: string, compName: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${compName}"? This action cannot be undone.`)) return;

    await deleteCompetition(compId);
    loadComps();
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", display: "flex", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`container fade-in`} style={{ padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", color: "var(--blue-900)", margin: 0 }}>Competitions</h2>
          <p style={{ color: "var(--color-text-muted)", margin: "0.2rem 0 0 0" }}>Manage tabulation for your active events.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Competition
        </button>
      </div>

      <div className={styles.grid}>
        {competitions.map((c) => (
          <Link key={c.id} href={`/admin/${c.id}`} className={`card ${styles.compCard}`}>
            <div className={styles.compHeader}>
              <Trophy size={24} color="var(--blue-500)" />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`badge ${c.status === "active" ? "badge-success" : c.status === "locked" ? "badge-warning" : "badge-neutral"}`}>
                  {c.status.toUpperCase()}
                </span>
                <button
                  onClick={(e) => handleDeleteCompetition(e, c.id, c.name)}
                  className="btn btn-ghost"
                  style={{ padding: "0.25rem", color: "var(--color-danger)" }}
                  title="Delete Competition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 style={{ margin: "0.5rem 0 0.2rem 0" }}>{c.name}</h3>
            <div className={styles.year}>AY {c.academicYear}</div>
            <p style={{ fontSize: "0.9rem", flex: 1, marginTop: "0.4rem" }}>{c.description}</p>
          </Link>
        ))}
      </div>

      {/* Add Competition Modal */}
      {showModal && (
        <div className={styles.modalBackdrop}>
          <div className={`card ${styles.modalCard}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "var(--blue-900)" }}>Add New Competition</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: "0.25rem" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCompetition} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Competition Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Best in Pop Sing & Dance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Academic Year</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 2026-2027"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. SOFEA General Assembly Competition"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Guidelines (1 per line)</label>
                <textarea
                  className="input"
                  style={{ minHeight: "80px", fontFamily: "inherit" }}
                  placeholder="e.g. Performance must last 3-4 minutes&#10;All vocals live"
                  value={guidelinesText}
                  onChange={(e) => setGuidelinesText(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
