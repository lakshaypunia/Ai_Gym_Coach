import type { SessionStats } from "./types";

/**
 * `history` is the last N completed sessions. It's always empty for now —
 * there's no persisted history yet (that's `lib/storage/history.ts`, Phase
 * 6) — so this always takes the "first-ever session" branch in practice
 * until then. Handling that case explicitly here (rather than just letting
 * Gemini see an empty array and guess) matches plan.md §11's testing note to
 * cover "first-ever session with no history" as its own case.
 */
export function buildPlanPrompt(history: SessionStats[]): string {
  if (history.length === 0) {
    return `You are a fitness coach. This user has no workout history yet — this would be their first session ever on this app. Suggest a beginner-friendly starter session: which exercise to try first (bicep curl, squat, or push-up), a modest rep/set target, and one general form cue to focus on. Keep it to 2-3 sentences.`;
  }

  return `You are a fitness coach. Based on this workout history, suggest today's session: which exercise(s), rough rep/set targets, and one specific form cue to focus on. Keep it to 2-3 sentences.
History: ${JSON.stringify(history)}`;
}
