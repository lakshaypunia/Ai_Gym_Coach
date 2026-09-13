import type { Landmark } from "@/types/pose";

/**
 * One Euro Filter (Casiez, Roussel & Vogel, 2012) — an adaptive low-pass
 * filter. Unlike a fixed-alpha EMA, it smooths harder when a point is
 * nearly still (killing jitter) and relaxes automatically as the point
 * starts moving fast (staying responsive during an actual rep), instead of
 * picking one fixed trade-off for both cases.
 *
 * https://cristal.univ-lille.fr/~casiez/1euro/
 */
class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrevMs: number | null = null;

  constructor(
    private readonly minCutoff: number,
    private readonly beta: number,
    private readonly dCutoff = 1.0,
  ) {}

  filter(x: number, tMs: number): number {
    if (this.xPrev === null || this.tPrevMs === null) {
      this.xPrev = x;
      this.tPrevMs = tMs;
      return x;
    }

    // Clamp dt so a stalled/duplicate frame timestamp can't divide-by-near-zero.
    const dt = Math.max((tMs - this.tPrevMs) / 1000, 1 / 120);
    this.tPrevMs = tMs;

    const dx = (x - this.xPrev) / dt;
    const dxSmoothed = lowPass(dx, this.dxPrev, alpha(this.dCutoff, dt));
    this.dxPrev = dxSmoothed;

    // Faster movement -> higher cutoff -> less smoothing (less lag).
    const cutoff = this.minCutoff + this.beta * Math.abs(dxSmoothed);
    const xSmoothed = lowPass(x, this.xPrev, alpha(cutoff, dt));
    this.xPrev = xSmoothed;

    return xSmoothed;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function lowPass(value: number, prev: number, a: number): number {
  return a * value + (1 - a) * prev;
}

// Landmarks are normalized 0..1, so these are tuned for that scale (a "1
// unit/sec" movement crosses the whole frame in a second) rather than the
// pixel-scale defaults (minCutoff=1.0, beta=0.007) from the original paper's
// mouse-tracking demo. Raise `beta` if fast reps still feel laggy; raise
// `minCutoff` if landmarks jitter even while holding still.
const DEFAULT_MIN_CUTOFF = 1.0;
const DEFAULT_BETA = 0.3;

/** Runs an independent One Euro Filter per landmark per axis (x/y/z). */
export class LandmarkSmoother {
  private filters: { x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter }[] = [];

  constructor(
    private readonly minCutoff = DEFAULT_MIN_CUTOFF,
    private readonly beta = DEFAULT_BETA,
  ) {}

  smooth(landmarks: Landmark[], timestampMs: number): Landmark[] {
    if (this.filters.length !== landmarks.length) {
      this.filters = landmarks.map(() => ({
        x: new OneEuroFilter(this.minCutoff, this.beta),
        y: new OneEuroFilter(this.minCutoff, this.beta),
        z: new OneEuroFilter(this.minCutoff, this.beta),
      }));
    }

    return landmarks.map((landmark, i) => {
      const filter = this.filters[i];
      return {
        x: filter.x.filter(landmark.x, timestampMs),
        y: filter.y.filter(landmark.y, timestampMs),
        z: filter.z.filter(landmark.z, timestampMs),
        visibility: landmark.visibility,
      };
    });
  }

  reset(): void {
    this.filters = [];
  }
}
