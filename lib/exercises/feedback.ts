import { angleForJoint } from "@/lib/geometry/angles";
import type { ExerciseConfig, FormRule } from "./types";
import type { PoseFrame } from "@/types/pose";

export interface FeedbackResult {
  /** Every rule currently violated this frame. */
  active: FormRule[];
  /** Rules that just transitioned false -> true this frame (not ones that
   *  were already violated last frame) — this is what should trigger a
   *  voice cue, so a held violation doesn't repeat every frame. */
  newlyViolated: FormRule[];
}

/**
 * Evaluates an exercise's posture rules against a pose frame. Tracks which
 * rules were already active so callers can distinguish "still violated" from
 * "just started" — per plan.md §8, voice cues fire on the false->true
 * transition only, not on every frame a violation holds.
 */
export class FeedbackEngine {
  private activeRuleIds = new Set<string>();

  constructor(private readonly config: ExerciseConfig) {}

  evaluate(frame: PoseFrame): FeedbackResult {
    const angles: Record<string, number> = {};
    const joints = [this.config.primaryJoint, ...(this.config.secondaryJoints ?? [])];
    for (const joint of joints) {
      const angle = angleForJoint(frame.landmarks, joint);
      if (angle !== null) angles[joint.label] = angle;
    }

    const active: FormRule[] = [];
    const newlyViolated: FormRule[] = [];
    const currentRuleIds = new Set<string>();

    for (const rule of this.config.formRules) {
      if (!rule.check(frame, angles)) continue;
      active.push(rule);
      currentRuleIds.add(rule.id);
      if (!this.activeRuleIds.has(rule.id)) newlyViolated.push(rule);
    }

    this.activeRuleIds = currentRuleIds;
    return { active, newlyViolated };
  }

  reset(): void {
    this.activeRuleIds.clear();
  }
}
