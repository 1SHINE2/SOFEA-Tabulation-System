"use client";
import { useState, useEffect } from "react";
import { subscribeParticipants } from "@/lib/db";
import type { Participant } from "@/lib/types";

export function useParticipants(competitionId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) return;
    const unsub = subscribeParticipants(competitionId, (data) => {
      setParticipants(data);
      setLoading(false);
    });
    return () => unsub();
  }, [competitionId]);

  return { participants, loading };
}
