import { describe, expect, it } from "vitest";
import { angleBetweenPoints, angleForJoint, isJointVisible } from "./angles";
import type { Landmark } from "@/types/pose";

function point(x: number, y: number, visibility = 1): Landmark {
  return { x, y, z: 0, visibility };
}

describe("angleBetweenPoints", () => {
  it("returns 90 degrees for a right angle", () => {
    const a = point(0, -1); // straight up from vertex
    const b = point(0, 0); // vertex
    const c = point(1, 0); // straight right from vertex
    expect(angleBetweenPoints(a, b, c)).toBeCloseTo(90, 5);
  });

  it("returns 180 degrees for a fully extended (straight) joint", () => {
    const a = point(-1, 0);
    const b = point(0, 0);
    const c = point(1, 0);
    expect(angleBetweenPoints(a, b, c)).toBeCloseTo(180, 5);
  });

  it("returns 0 degrees when both arms point the same direction", () => {
    const a = point(1, 0);
    const b = point(0, 0);
    const c = point(1, 0);
    expect(angleBetweenPoints(a, b, c)).toBeCloseTo(0, 5);
  });

  it("returns 45 degrees for a known diagonal", () => {
    const a = point(1, 0);
    const b = point(0, 0);
    const c = point(1, 1);
    expect(angleBetweenPoints(a, b, c)).toBeCloseTo(45, 5);
  });

  it("is symmetric under swapping the two outer points", () => {
    const a = point(0.4, -0.6);
    const b = point(0.1, 0.2);
    const c = point(-0.9, 0.3);
    expect(angleBetweenPoints(a, b, c)).toBeCloseTo(angleBetweenPoints(c, b, a), 10);
  });
});

describe("angleForJoint", () => {
  const joint = { a: 0, b: 1, c: 2, label: "test_joint" };

  it("computes the angle for a valid triple of landmark indices", () => {
    const landmarks = [point(0, -1), point(0, 0), point(1, 0)];
    expect(angleForJoint(landmarks, joint)).toBeCloseTo(90, 5);
  });

  it("returns null when a required landmark index is missing", () => {
    const landmarks = [point(0, -1), point(0, 0)]; // index 2 missing
    expect(angleForJoint(landmarks, joint)).toBeNull();
  });
});

describe("isJointVisible", () => {
  const joint = { a: 0, b: 1, c: 2, label: "test_joint" };

  it("is true when all three landmarks meet the visibility threshold", () => {
    const landmarks = [point(0, 0, 0.9), point(0, 0, 0.6), point(0, 0, 0.5)];
    expect(isJointVisible(landmarks, joint, 0.5)).toBe(true);
  });

  it("is false when any landmark falls below the visibility threshold", () => {
    const landmarks = [point(0, 0, 0.9), point(0, 0, 0.4), point(0, 0, 0.9)];
    expect(isJointVisible(landmarks, joint, 0.5)).toBe(false);
  });
});
