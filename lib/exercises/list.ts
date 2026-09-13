export interface ExerciseSummary {
  id: string;
  name: string;
  description: string;
}

// Lightweight metadata for the picker UI. Full FSM configs (angle thresholds,
// form rules) land in lib/exercises/configs.ts during Phase 3.
export const EXERCISES: ExerciseSummary[] = [
  { id: "bicep_curl", name: "Bicep Curl", description: "Elbow flexion/extension rep counting with elbow-tuck form check." },
  { id: "squat", name: "Squat", description: "Hip-knee-ankle depth tracking with knee-valgus and torso-lean checks." },
  { id: "pushup", name: "Push-up", description: "Shoulder-elbow-wrist tracking with hip-sag form check." },
];

export function getExerciseById(id: string): ExerciseSummary | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}
