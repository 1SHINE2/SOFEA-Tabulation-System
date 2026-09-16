"use client";
import { useState, useEffect } from "react";
import { subscribeScores } from "@/lib/db";
import type { ScoreEntry } from "@/lib/types";

export function useScores(competitionId: string) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeScores(competitionId, (data) => {
      setScores(data);
      setLoading(false);
    });
    return () => unsub();
  }, [competitionId]);

  return { scores, loading };
}
