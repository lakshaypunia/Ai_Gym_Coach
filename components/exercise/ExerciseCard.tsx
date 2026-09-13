import Link from "next/link";
import type { ExerciseSummary } from "@/lib/exercises/list";

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  return (
    <Link
      href={`/workout/${exercise.id}`}
      className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/30 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30"
    >
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">{exercise.name}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{exercise.description}</p>
    </Link>
  );
}
