import { ExerciseCard } from "@/components/exercise/ExerciseCard";
import { EXERCISES } from "@/lib/exercises/list";

export default function WorkoutPickerPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
        Choose an exercise
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Your camera feed stays on-device — pose data never leaves the browser.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EXERCISES.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}
