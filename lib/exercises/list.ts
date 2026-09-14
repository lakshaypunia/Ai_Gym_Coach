export interface ExerciseSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Lightweight metadata for the picker UI. Full FSM configs (angle thresholds,
// form rules) land in lib/exercises/configs.ts during Phase 3.
export const EXERCISES: ExerciseSummary[] = [
  {
    id: "bicep_curl",
    name: "Bicep Curl",
    description: "Elbow flexion/extension rep counting with elbow-tuck form check.",
    icon: "💪",
  },
  {
    id: "squat",
    name: "Squat",
    description: "Hip-knee-ankle depth tracking with knee-valgus and torso-lean checks.",
    icon: "🦵",
  },
  {
    id: "pushup",
    name: "Push-up",
    description: "Shoulder-elbow-wrist tracking with hip-sag form check.",
    icon: "🤸",
  },
];

export function getExerciseById(id: string): ExerciseSummary | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}
