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
  secondaryJoints: [
    {
      a: POSE_LANDMARKS.LEFT_HIP,
      b: POSE_LANDMARKS.LEFT_SHOULDER,
      c: POSE_LANDMARKS.LEFT_ELBOW,
      label: "left_upper_arm_drift",
    },
  ],
  downThresholdDeg: 30,
  upThresholdDeg: 160,
  formRules: [
    {
      id: "elbow_drift",
      message: "Keep your elbow tucked in",
      severity: "warning",
      // Angle at the shoulder between torso and upper arm — stays small
      // while the elbow is pinned to the torso, opens up if it swings out.
      check: (_frame, angles) => (angles.left_upper_arm_drift ?? 0) > 45,
    },
  ],
};

const SQUAT: ExerciseConfig = {
  id: "squat",
  name: "Squat",
  primaryJoint: {
    a: POSE_LANDMARKS.LEFT_HIP,
    b: POSE_LANDMARKS.LEFT_KNEE,
    c: POSE_LANDMARKS.LEFT_ANKLE,
    label: "left_knee",
  },
  secondaryJoints: [
    {
      a: POSE_LANDMARKS.LEFT_SHOULDER,
      b: POSE_LANDMARKS.LEFT_HIP,
      c: POSE_LANDMARKS.LEFT_KNEE,
      label: "left_torso_lean",
    },
  ],
  downThresholdDeg: 100,
  upThresholdDeg: 165,
  formRules: [
    {
      id: "knee_valgus",
      message: "Push your knees out",
      severity: "warning",
      check: (frame, angles) => {
        // Only check once actually descending — narrow knees while standing
        // tall isn't a form fault.
        const kneeAngle = angles.left_knee;
        if (kneeAngle === undefined || kneeAngle > 150) return false;

        const leftKnee = frame.landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const rightKnee = frame.landmarks[POSE_LANDMARKS.RIGHT_KNEE];
        const leftAnkle = frame.landmarks[POSE_LANDMARKS.LEFT_ANKLE];
        const rightAnkle = frame.landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
        if (!leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return false;

        const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
        const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
        if (ankleWidth < 0.02) return false; // stance too narrow on screen to judge reliably

        // Knees noticeably narrower than the ankle stance = caving inward.
        return kneeWidth / ankleWidth < 0.8;
      },
    },
    {
      id: "torso_lean",
      message: "Keep your chest up",
      severity: "warning",
      check: (_frame, angles) => {
        const lean = angles.left_torso_lean;
        return lean !== undefined && lean < 60;
      },
    },
  ],
};

const PUSHUP: ExerciseConfig = {
  id: "pushup",
  name: "Push-up",
  primaryJoint: {
    a: POSE_LANDMARKS.LEFT_SHOULDER,
    b: POSE_LANDMARKS.LEFT_ELBOW,
    c: POSE_LANDMARKS.LEFT_WRIST,
    label: "left_elbow",
  },
  secondaryJoints: [
    {
      a: POSE_LANDMARKS.LEFT_SHOULDER,
      b: POSE_LANDMARKS.LEFT_HIP,
      c: POSE_LANDMARKS.LEFT_ANKLE,
      label: "left_body_line",
    },
  ],
  downThresholdDeg: 90,
  upThresholdDeg: 160,
  formRules: [
    {
      id: "hip_sag",
      message: "Engage your core — keep your body in a straight line",
      severity: "warning",
      // Shoulder-hip-ankle should stay close to a straight 180 deg line;
      // a hip sag (or pike) bends it noticeably either way.
      check: (_frame, angles) => {
        const bodyLine = angles.left_body_line;
        return bodyLine !== undefined && bodyLine < 160;
      },
    },
  ],
};

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  [BICEP_CURL.id]: BICEP_CURL,
  [SQUAT.id]: SQUAT,
  [PUSHUP.id]: PUSHUP,
};

/** Returns the FSM config for an exercise id, or undefined if rep counting
 *  isn't implemented for it yet. */
export function getExerciseConfig(id: string): ExerciseConfig | undefined {
  return EXERCISE_CONFIGS[id];
}
