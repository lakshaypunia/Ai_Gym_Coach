import { extractResponseText, getGeminiModel } from "@/lib/ai/geminiClient";
import { buildSummaryPrompt } from "@/lib/ai/buildSummaryPrompt";
import type { SessionStats } from "@/lib/ai/types";

function fallbackSummary(stats: SessionStats): string {
  const totalViolations = stats.formViolations.reduce((sum, v) => sum + v.count, 0);
  if (totalViolations === 0) {
    return `Nice work — ${stats.totalReps} reps of ${stats.exerciseName} with clean form throughout.`;
  }
  const top = [...stats.formViolations].sort((a, b) => b.count - a.count)[0];
  return `Nice work — ${stats.totalReps} reps of ${stats.exerciseName}. Keep an eye on: ${top.message.toLowerCase()}.`;
}

export async function POST(req: Request) {
  const stats = (await req.json()) as SessionStats;

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(buildSummaryPrompt(stats));
    const feedback = extractResponseText(result);
    if (!feedback) throw new Error("Empty response from Gemini");
    return Response.json({ feedback });
  } catch (error) {
    console.error("POST /api/feedback failed, using fallback summary:", error);
    return Response.json({ feedback: fallbackSummary(stats), fallback: true });
  }
}
