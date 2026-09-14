import { extractResponseText, getGeminiModel } from "@/lib/ai/geminiClient";
import { buildPlanPrompt } from "@/lib/ai/buildPlanPrompt";
import type { SessionStats } from "@/lib/ai/types";

function fallbackPlan(history: SessionStats[]): string {
  if (history.length === 0) {
    return "Try a starter session: 3 sets of 10 bicep curls, focusing on keeping your elbow tucked to your torso throughout.";
  }
  const last = history[history.length - 1];
  return `Pick up where you left off — another round of ${last.exerciseName}, aiming to beat your ${last.totalReps} reps from last time.`;
}

export async function POST(req: Request) {
  const history = (await req.json()) as SessionStats[];

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(buildPlanPrompt(history));
    const plan = extractResponseText(result);
    if (!plan) throw new Error("Empty response from Gemini");
    return Response.json({ plan });
  } catch (error) {
    console.error("POST /api/plan failed, using fallback plan:", error);
    return Response.json({ plan: fallbackPlan(history), fallback: true });
  }
}
