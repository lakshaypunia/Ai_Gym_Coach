import type { ExerciseConfig } from "./types";

/** MediaPipe BlazePose (33-point) landmark indices. Left/right are
 *  anatomical (the performer's own left/right), not camera-relative. */
export const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const BICEP_CURL: ExerciseConfig = {
  id: "bicep_curl",
  name: "Bicep Curl",
  primaryJoint: {
    a: POSE_LANDMARKS.LEFT_SHOULDER,
    b: POSE_LANDMARKS.LEFT_ELBOW,
    c: POSE_LANDMARKS.LEFT_WRIST,
    label: "left_elbow",
  },
  downThresholdDeg: 30,
  upThresholdDeg: 160,
  // Posture-correction rules (e.g. elbow drifting from torso) land in Phase 4.
  formRules: [],
};

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  [BICEP_CURL.id]: BICEP_CURL,
};

/** Returns the FSM config for an exercise id, or undefined if rep counting
 *  isn't implemented for it yet (squat/pushup land in Phase 4). */
export function getExerciseConfig(id: string): ExerciseConfig | undefined {
  return EXERCISE_CONFIGS[id];
}
