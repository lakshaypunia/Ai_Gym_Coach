import type { SessionStats } from "./types";

export function buildSummaryPrompt(stats: SessionStats): string {
  return `You are a supportive fitness coach. Given this workout data, write a 2-3 sentence summary: encouraging tone, call out one specific form issue to fix next time (or praise clean form if there were no violations), and end on a motivating note.
Data: ${JSON.stringify(stats)}`;
}
