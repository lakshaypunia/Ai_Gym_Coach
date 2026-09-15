import type { SessionStats } from "@/lib/ai/types";

export interface SessionRecord extends SessionStats {
  id: string;
  /** ISO 8601 timestamp of when the session ended. */
  date: string;
  /** Cached Gemini (or fallback) summary text, so history doesn't need to re-fetch it. */
  aiSummary?: string;
}

const STORAGE_KEY = "ai-gym-coach:history";
const MAX_RECORDS = 50;

function readAll(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    // Corrupt JSON, or localStorage unavailable (private browsing, etc.) —
    // history is best-effort, never block the workout flow on it.
    return [];
  }
}

function writeAll(records: SessionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota exceeded or storage disabled — silently drop, same reasoning as above.
  }
}

/** All saved sessions, most recent first. */
export function getHistory(): SessionRecord[] {
  // Reverse before the (stable) sort so two sessions saved in the same
  // millisecond — same `date` string, tied on the sort key — still come out
  // most-recently-saved-first instead of falling back to insertion order.
  return readAll().reverse().sort((a, b) => b.date.localeCompare(a.date));
}

/** The most recent `limit` sessions — what gets sent to /api/plan as context. */
export function getRecentHistory(limit = 5): SessionRecord[] {
  return getHistory().slice(0, limit);
}

/** Appends a completed session, trimming the oldest once past MAX_RECORDS. */
export function saveSession(stats: SessionStats, aiSummary?: string): SessionRecord {
  const record: SessionRecord = {
    ...stats,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    aiSummary,
  };

  const records = readAll();
  records.push(record);
  if (records.length > MAX_RECORDS) {
    records.splice(0, records.length - MAX_RECORDS);
  }
  writeAll(records);

  return record;
}

export function clearHistory(): void {
  writeAll([]);
}
