"use client";

import { useEffect, useState } from "react";
import { speak } from "@/lib/audio/speak";
import { saveSession } from "@/lib/storage/history";
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
        return data.feedback;
      })
      .catch(() => {
        const fallback = `Nice work — ${stats.totalReps} reps of ${stats.exerciseName}.`;
        if (!cancelled) setSummary(fallback);
        return fallback;
      })
      .then((finalSummary: string) => {
        // Persisted regardless of whether it was AI-generated or the
        // fallback text — the record is still useful history either way.
        saveSession(stats, finalSummary);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const violationTotal = stats.formViolations.reduce((sum, v) => sum + v.count, 0);

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-xl"
          >
            🎉
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Session complete</h2>
            <p className="text-sm text-muted">{stats.exerciseName}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-background px-3 py-2 text-center ring-1 ring-border">
            <div className="text-lg font-bold tabular-nums">{stats.totalReps}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Reps</div>
          </div>
          <div className="rounded-lg bg-background px-3 py-2 text-center ring-1 ring-border">
            <div className="text-lg font-bold tabular-nums">{Math.round(stats.durationSec)}s</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Duration</div>
          </div>
          <div className="rounded-lg bg-background px-3 py-2 text-center ring-1 ring-border">
            <div className="text-lg font-bold tabular-nums">{violationTotal}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Form flags</div>
          </div>
        </div>

        <div className="min-h-[3.5rem] rounded-lg bg-accent-soft px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full animate-pulse rounded bg-accent/15" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-accent/15" />
            </div>
          ) : (
            <p className="text-sm leading-6 text-foreground/90">{summary}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {summary && !loading && (
            <button
              type="button"
              onClick={() => speak(summary, { minGapMs: 0 })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
            >
              ▶ Play
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-accent/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
