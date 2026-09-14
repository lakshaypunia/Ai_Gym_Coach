export interface FormViolationStat {
  ruleId: string;
  message: string;
  count: number;
}

/**
 * Aggregated stats for one completed session — this, not raw video or
 * landmarks, is all that ever reaches the server (see plan.md §2/§9).
 */
export interface SessionStats {
  exerciseId: string;
  exerciseName: string;
  totalReps: number;
  durationSec: number;
  formViolations: FormViolationStat[];
}
