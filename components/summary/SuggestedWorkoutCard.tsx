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
    <div className="w-full max-w-md rounded-xl border border-accent/20 bg-accent-soft p-5 text-left">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="text-base">
          ✨
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
          Suggested for today
        </h3>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-accent/15" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-accent/15" />
        </div>
      ) : (
        <p className="text-sm leading-6 text-foreground/90">{plan}</p>
      )}
    </div>
  );
}
