"use client";

import { useEffect, useState } from "react";
import { speak } from "@/lib/audio/speak";
import type { SessionStats } from "@/lib/ai/types";

interface SessionSummaryModalProps {
  stats: SessionStats;
  onClose: () => void;
}

export function SessionSummaryModal({ stats, onClose }: SessionSummaryModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stats),
    })
      .then((res) => res.json())
      .then((data: { feedback: string }) => {
        if (!cancelled) setSummary(data.feedback);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(`Nice work — ${stats.totalReps} reps of ${stats.exerciseName}.`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold text-black dark:text-zinc-50">
          Session complete
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          {stats.exerciseName} — {stats.totalReps} reps in {Math.round(stats.durationSec)}s
        </p>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Getting your summary…</p>
        ) : (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{summary}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {summary && !loading && (
            <button
              type="button"
              onClick={() => speak(summary, { minGapMs: 0 })}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:text-zinc-50 dark:hover:bg-white/10"
            >
              Play
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
