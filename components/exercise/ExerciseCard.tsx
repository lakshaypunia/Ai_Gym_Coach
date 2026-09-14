import Link from "next/link";
import type { ExerciseSummary } from "@/lib/exercises/list";

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  return (
    <Link
      href={`/workout/${exercise.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-xl"
      >
        {exercise.icon}
      </span>
      <div>
        <h3 className="flex items-center gap-1.5 text-lg font-semibold">
          {exercise.name}
          <span
            aria-hidden
            className="text-accent opacity-0 transition-opacity group-hover:opacity-100"
          >
            →
          </span>
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">{exercise.description}</p>
      </div>
    </Link>
  );
}
