import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearHistory, getHistory, getRecentHistory, saveSession } from "./history";
import type { SessionStats } from "@/lib/ai/types";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function stats(overrides: Partial<SessionStats> = {}): SessionStats {
  return {
    exerciseId: "bicep_curl",
    exerciseName: "Bicep Curl",
    totalReps: 10,
    durationSec: 60,
    formViolations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: createMemoryStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("history storage", () => {
  it("returns an empty array when nothing has been saved", () => {
    expect(getHistory()).toEqual([]);
  });

  it("saves a session and reads it back with an id and date attached", () => {
    const record = saveSession(stats(), "Great set!");
    expect(record.id).toBeTruthy();
    expect(record.date).toBeTruthy();
    expect(record.aiSummary).toBe("Great set!");

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].totalReps).toBe(10);
  });

  it("orders history most-recent-first", () => {
    saveSession(stats({ exerciseId: "first" }));
    saveSession(stats({ exerciseId: "second" }));
    saveSession(stats({ exerciseId: "third" }));

    const history = getHistory();
    expect(history.map((r) => r.exerciseId)).toEqual(["third", "second", "first"]);
  });

  it("getRecentHistory limits to the requested count", () => {
    for (let i = 0; i < 8; i++) saveSession(stats({ exerciseId: `session-${i}` }));
    expect(getRecentHistory(3)).toHaveLength(3);
    expect(getRecentHistory()).toHaveLength(5); // default limit
  });

  it("clearHistory empties the store", () => {
    saveSession(stats());
    expect(getHistory()).toHaveLength(1);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it("is a no-op (not a throw) when window is unavailable", () => {
    vi.unstubAllGlobals();
    expect(() => saveSession(stats())).not.toThrow();
    expect(getHistory()).toEqual([]);
  });
});
