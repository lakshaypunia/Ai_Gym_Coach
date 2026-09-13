export type RepPhase = "idle" | "down" | "up";

export interface FsmUpdateResult {
  phase: RepPhase;
  repCompleted: boolean;
}

/**
 * Generic per-exercise rep-counting state machine, driven purely by a single
 * angle reading per frame:
 *
 *   idle --(angle <= downThreshold)--> down
 *   down --(angle >= upThreshold)----> up   --> rep++
 *   up   --(angle <= downThreshold)--> down
 *
 * A rep is only counted on the down -> up transition, matching one full
 * contract-then-extend cycle. Guards against false reps from jitter:
 *  - `debounceMs`: ignores transitions faster than a physically plausible rep
 *  - visibility gate: caller passes `visible = false` on occlusion to freeze
 *    the machine instead of transitioning on noisy landmark data
 */
export class RepCounterFsm {
  private phase: RepPhase = "idle";
  // -Infinity (not 0) so the very first transition is never blocked by the
  // debounce check below, even if `nowMs` itself starts near zero.
  private lastTransitionAt = -Infinity;

  constructor(
    private readonly downThresholdDeg: number,
    private readonly upThresholdDeg: number,
    private readonly debounceMs = 150,
  ) {}

  getPhase(): RepPhase {
    return this.phase;
  }

  update(angleDeg: number, visible: boolean, nowMs: number): FsmUpdateResult {
    if (!visible || nowMs - this.lastTransitionAt < this.debounceMs) {
      return { phase: this.phase, repCompleted: false };
    }

    let repCompleted = false;

    switch (this.phase) {
      case "idle":
        if (angleDeg <= this.downThresholdDeg) {
          this.transitionTo("down", nowMs);
        } else if (angleDeg >= this.upThresholdDeg) {
          this.transitionTo("up", nowMs);
        }
        break;
      case "down":
        if (angleDeg >= this.upThresholdDeg) {
          this.transitionTo("up", nowMs);
          repCompleted = true;
        }
        break;
      case "up":
        if (angleDeg <= this.downThresholdDeg) {
          this.transitionTo("down", nowMs);
        }
        break;
    }

    return { phase: this.phase, repCompleted };
  }

  reset(): void {
    this.phase = "idle";
    this.lastTransitionAt = -Infinity;
  }

  private transitionTo(phase: RepPhase, nowMs: number): void {
    this.phase = phase;
    this.lastTransitionAt = nowMs;
  }
}
