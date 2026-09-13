import type { JointTriple } from "@/lib/geometry/angles";
import type { PoseFrame } from "@/types/pose";

export type { JointTriple };

export interface FormRule {
  id: string;
  /** Returns true when the rule is violated for this frame. */
  check: (frame: PoseFrame, angles: Record<string, number>) => boolean;
  message: string;
  severity: "warning" | "critical";
}

export interface ExerciseConfig {
  id: string;
  name: string;
  /** Joint whose angle drives the rep-counting FSM. */
  primaryJoint: JointTriple;
  /** Only used for form-correction rules, not rep counting. */
  secondaryJoints?: JointTriple[];
  /** Angle below which the rep is considered "down" (contracted/flexed). */
  downThresholdDeg: number;
  /** Angle above which the rep is considered "up" (extended). */
  upThresholdDeg: number;
  formRules: FormRule[];
}
