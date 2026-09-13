import type { Landmark } from "@/types/pose";

/**
 * Exponential moving average smoothing across successive pose frames.
 * Reduces per-frame landmark jitter before it reaches angle/FSM logic.
 * `alpha` is the weight given to the newest sample (0..1) — lower is smoother
 * but laggier, higher tracks faster but jitters more.
 */
export class LandmarkSmoother {
  private smoothed: Landmark[] | null = null;

  constructor(private readonly alpha = 0.4) {}

  smooth(landmarks: Landmark[]): Landmark[] {
    if (!this.smoothed || this.smoothed.length !== landmarks.length) {
      this.smoothed = landmarks.map((landmark) => ({ ...landmark }));
      return this.smoothed;
    }

    this.smoothed = landmarks.map((landmark, i) => {
      const prev = this.smoothed![i];
      return {
        x: lerp(prev.x, landmark.x, this.alpha),
        y: lerp(prev.y, landmark.y, this.alpha),
        z: lerp(prev.z, landmark.z, this.alpha),
        visibility: landmark.visibility,
      };
    });

    return this.smoothed;
  }

  reset(): void {
    this.smoothed = null;
  }
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}
