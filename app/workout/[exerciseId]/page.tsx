import { notFound } from "next/navigation";
import { WorkoutSession } from "@/components/camera/WorkoutSession";
import { getExerciseById } from "@/lib/exercises/list";

export default async function WorkoutSessionPage({
  params,
}: PageProps<"/workout/[exerciseId]">) {
  const { exerciseId } = await params;
  const exercise = getExerciseById(exerciseId);

  if (!exercise) {
    notFound();
  }

  return <WorkoutSession exercise={exercise} />;
}
