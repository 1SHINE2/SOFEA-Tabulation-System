// hooks/useSession.ts
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

/**
 * Returns the current session, redirects to "/" if not authenticated
 * or if the role doesn't match the required role.
 */
export function useSession(requiredRole?: UserRole) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();

    if (!s) {
      router.replace("/");
      return;
    }

    if (requiredRole && s.role !== requiredRole) {
      router.replace("/");
      return;
    }

    setSession(s);
    setLoading(false);
  }, [router, requiredRole]);

  function logout() {
    clearSession();
    router.replace("/");
  }

  return { session, loading, logout };
}
