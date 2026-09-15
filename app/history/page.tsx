"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clearHistory, getHistory, type SessionRecord } from "@/lib/storage/history";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SessionRecord[] | null>(null);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this has to run client-side
    // after mount — the null sentinel keeps the server and first client
    // render in agreement (both show "Loading…") to avoid a hydration
    // mismatch once real data lands.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getHistory());
  }, []);

  function handleClear() {
    clearHistory();
    setHistory([]);
  }

  if (history === null) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-sm text-muted">Loading history…</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <span aria-hidden className="text-4xl">
          📈
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">No sessions yet</h1>
        <p className="max-w-sm text-sm text-muted">
          Complete a workout and click &ldquo;End session&rdquo; to start building your history.
        </p>
        <Link
          href="/workout"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm shadow-accent/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Start a workout
        </Link>
      </div>
    );
  }

  const chartData = [...history].reverse().map((record) => ({
    label: formatShortDate(record.date),
    reps: record.totalReps,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted">
            {history.length} session{history.length === 1 ? "" : "s"} logged — stored only on
            this device.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div className="mb-8 h-56 rounded-xl border border-border bg-surface p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar dataKey="reps" name="Reps" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-3">
        {history.map((record) => {
          const violationTotal = record.formViolations.reduce((sum, v) => sum + v.count, 0);
          return (
            <div key={record.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{record.exerciseName}</h3>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(record.date)}</span>
              </div>
              <div className="mt-1 flex gap-4 text-sm text-muted">
                <span>{record.totalReps} reps</span>
                <span>{Math.round(record.durationSec)}s</span>
                <span>{violationTotal} form flags</span>
              </div>
              {record.aiSummary && (
                <p className="mt-2 text-sm leading-6 text-foreground/90">{record.aiSummary}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
