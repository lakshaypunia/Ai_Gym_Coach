import type { Landmark } from "@/types/pose";

/** Three landmark indices defining an angle, `b` is the vertex. */
export interface JointTriple {
  a: number;
  b: number;
  c: number;
  label: string;
}

/**
 * Angle ABC in degrees, using the dot-product form of the law of cosines:
 * cosθ = (BA·BC) / (|BA||BC|). Only x/y are used — z is depth-ish but noisy
 * on a single camera, so 2D keeps this robust.
 */
export function angleBetweenPoints(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (magBA * magBC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Resolves a JointTriple against a landmark frame and returns the angle, or
 *  null if any of the three landmarks weren't detected this frame. */
export function angleForJoint(landmarks: Landmark[], joint: JointTriple): number | null {
  const a = landmarks[joint.a];
  const b = landmarks[joint.b];
  const c = landmarks[joint.c];
  if (!a || !b || !c) return null;
  return angleBetweenPoints(a, b, c);
}

/** True if every landmark in the triple is visible enough to trust — used to
 *  freeze rep counting instead of transitioning on noisy/occluded data. */
export function isJointVisible(landmarks: Landmark[], joint: JointTriple, minVisibility = 0.5): boolean {
  return [joint.a, joint.b, joint.c].every((index) => {
    const visibility = landmarks[index]?.visibility;
    return visibility === undefined || visibility >= minVisibility;
  });
}
