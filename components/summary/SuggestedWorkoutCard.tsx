"use client";

import { useEffect, useState } from "react";

const FALLBACK_PLAN =
  "Try a starter session: 3 sets of 10 bicep curls, focusing on keeping your elbow tucked to your torso.";

export function SuggestedWorkoutCard() {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Always sent as an empty history for now — there's no persisted session
    // history yet (lib/storage/history.ts lands in Phase 6), so this always
    // gets Gemini's "first-ever session" suggestion. See buildPlanPrompt.ts.
    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    })
      .then((res) => res.json())
      .then((data: { plan: string }) => {
        if (!cancelled) setPlan(data.plan);
      })
      .catch(() => {
        if (!cancelled) setPlan(FALLBACK_PLAN);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-5 text-left dark:border-white/10 dark:bg-zinc-900">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Suggested for today
      </h3>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading today&apos;s suggestion…</p>
      ) : (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{plan}</p>
      )}
    </div>
  );
}
