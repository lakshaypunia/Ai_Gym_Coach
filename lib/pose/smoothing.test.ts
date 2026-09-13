import { describe, expect, it } from "vitest";
import { LandmarkSmoother } from "./smoothing";
import type { Landmark } from "@/types/pose";

function frame(x: number): Landmark[] {
  return [{ x, y: 0, z: 0, visibility: 1 }];
}

const FRAME_MS = 1000 / 30; // ~30fps

describe("LandmarkSmoother", () => {
  it("passes the first sample through unchanged (nothing to smooth against yet)", () => {
    const smoother = new LandmarkSmoother();
    const [point] = smoother.smooth(frame(0.5), 0);
    expect(point.x).toBeCloseTo(0.5, 10);
  });

  it("dampens jitter around a held-still position", () => {
    const smoother = new LandmarkSmoother();
    const base = 0.5;
    const noise = [0.01, -0.01, 0.012, -0.008, 0.01, -0.011, 0.009, -0.01];

    let t = 0;
    let last = smoother.smooth(frame(base), (t += FRAME_MS))[0].x;
    for (const n of noise) {
      last = smoother.smooth(frame(base + n), (t += FRAME_MS))[0].x;
    }

    // Raw noise swings +/-0.012; the smoothed output should land much closer
    // to the true resting position than the last raw noisy sample did.
    expect(Math.abs(last - base)).toBeLessThan(0.006);
  });

  it("tracks a sustained real movement instead of staying permanently lagged", () => {
    const smoother = new LandmarkSmoother();
    let t = 0;
    let last = smoother.smooth(frame(0), (t += FRAME_MS))[0].x;

    // Simulate a fast, sustained move from 0 -> 1 over ~300ms (a real rep).
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      last = smoother.smooth(frame(i / steps), (t += FRAME_MS))[0].x;
    }

    // It shouldn't still be stuck near the start after a real, sustained move.
    expect(last).toBeGreaterThan(0.6);
  });

  it("re-initializes per-landmark filters if the landmark count changes", () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(frame(0.5), 0);
    const twoPoints: Landmark[] = [
      { x: 0.1, y: 0, z: 0, visibility: 1 },
      { x: 0.9, y: 0, z: 0, visibility: 1 },
    ];
    const result = smoother.smooth(twoPoints, FRAME_MS);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(0.1, 10);
    expect(result[1].x).toBeCloseTo(0.9, 10);
  });
});
