import { describe, expect, it } from "vitest";
import { FeedbackEngine } from "./feedback";
import { EXERCISE_CONFIGS, POSE_LANDMARKS } from "./configs";
import type { ExerciseConfig, FormRule } from "./types";
import type { Landmark, PoseFrame } from "@/types/pose";

function frameWith(overrides: Record<number, Partial<Landmark>>): PoseFrame {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
  }));
  for (const [index, value] of Object.entries(overrides)) {
    landmarks[Number(index)] = { ...landmarks[Number(index)], ...value };
  }
  return { landmarks, timestampMs: 0 };
}

describe("FeedbackEngine", () => {
  const alwaysViolated: FormRule = {
    id: "always",
    message: "always violated",
    severity: "warning",
    check: () => true,
  };
  const neverViolated: FormRule = {
    id: "never",
    message: "never violated",
    severity: "warning",
    check: () => false,
  };
  const stubConfig: ExerciseConfig = {
    id: "stub",
    name: "Stub",
    primaryJoint: { a: 0, b: 1, c: 2, label: "stub_joint" },
    downThresholdDeg: 30,
    upThresholdDeg: 160,
    formRules: [alwaysViolated, neverViolated],
  };

  it("reports a newly-violated rule only on the frame it starts", () => {
    const engine = new FeedbackEngine(stubConfig);
    const frame = frameWith({});

    const first = engine.evaluate(frame);
    expect(first.active.map((r) => r.id)).toEqual(["always"]);
    expect(first.newlyViolated.map((r) => r.id)).toEqual(["always"]);

    const second = engine.evaluate(frame);
    expect(second.active.map((r) => r.id)).toEqual(["always"]);
    expect(second.newlyViolated).toEqual([]); // still violated, but not "new" anymore
  });

  it("reports newly-violated again after the rule clears and re-triggers", () => {
    const config: ExerciseConfig = {
      ...stubConfig,
      formRules: [neverViolated], // starts cleared
    };
    const engine = new FeedbackEngine(config);
    const frame = frameWith({});

    expect(engine.evaluate(frame).newlyViolated).toEqual([]);

    config.formRules[0] = alwaysViolated;
    const violated = engine.evaluate(frame);
    expect(violated.newlyViolated.map((r) => r.id)).toEqual(["always"]);

    config.formRules[0] = neverViolated;
    expect(engine.evaluate(frame).active).toEqual([]);

    config.formRules[0] = alwaysViolated;
    const retriggered = engine.evaluate(frame);
    expect(retriggered.newlyViolated.map((r) => r.id)).toEqual(["always"]);
  });

  it("reset() clears tracked state so the next violation counts as new again", () => {
    const engine = new FeedbackEngine(stubConfig);
    const frame = frameWith({});
    engine.evaluate(frame); // "always" becomes active
    engine.reset();
    const afterReset = engine.evaluate(frame);
    expect(afterReset.newlyViolated.map((r) => r.id)).toEqual(["always"]);
  });
});

describe("squat form rules", () => {
  const squat = EXERCISE_CONFIGS.squat;
  const engine = () => new FeedbackEngine(squat);

  it("flags knee valgus when knees are much narrower than ankles while bent", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.45, y: 0.3 },
      [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.6, y: 0.6 }, // knee pushed forward -> ~127deg, bent
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.45, y: 0.9 },
      [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.62, y: 0.6 }, // knees close together
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.85, y: 0.9 }, // ankles wide apart
    });
    const result = engine().evaluate(frame);
    expect(result.active.some((r) => r.id === "knee_valgus")).toBe(true);
  });

  it("does not flag knee valgus while standing (primary joint near full extension)", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.45, y: 0.3 },
      [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.45, y: 0.6 }, // straight leg, ~180deg
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.45, y: 0.9 },
      [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.5, y: 0.6 },
      [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.75, y: 0.9 },
    });
    const result = engine().evaluate(frame);
    expect(result.active.some((r) => r.id === "knee_valgus")).toBe(false);
  });

  it("flags excessive torso lean", () => {
    const frame = frameWith({
      // Shoulder-hip vector angled toward the same direction as hip-knee
      // (down and to the side) instead of opposite it -> ~45deg, a deep fold.
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.65, y: 0.65 },
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.5 },
      [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.5, y: 0.8 },
    });
    const result = engine().evaluate(frame);
    expect(result.active.some((r) => r.id === "torso_lean")).toBe(true);
  });
});

describe("pushup form rules", () => {
  const pushup = EXERCISE_CONFIGS.pushup;

  it("flags a sagging body line", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.1, y: 0.5 },
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.75 }, // hips dropped well below the shoulder-ankle line
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.9, y: 0.5 },
    });
    const result = new FeedbackEngine(pushup).evaluate(frame);
    expect(result.active.some((r) => r.id === "hip_sag")).toBe(true);
  });

  it("does not flag a straight body line", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.1, y: 0.5 },
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.5 },
      [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.9, y: 0.5 },
    });
    const result = new FeedbackEngine(pushup).evaluate(frame);
    expect(result.active.some((r) => r.id === "hip_sag")).toBe(false);
  });
});

describe("bicep curl form rules", () => {
  const curl = EXERCISE_CONFIGS.bicep_curl;

  it("flags the elbow drifting away from the torso", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.9 },
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.5, y: 0.3 },
      [POSE_LANDMARKS.LEFT_ELBOW]: { x: 0.9, y: 0.35 }, // flared well out to the side
    });
    const result = new FeedbackEngine(curl).evaluate(frame);
    expect(result.active.some((r) => r.id === "elbow_drift")).toBe(true);
  });

  it("does not flag an elbow tucked to the torso", () => {
    const frame = frameWith({
      [POSE_LANDMARKS.LEFT_HIP]: { x: 0.5, y: 0.9 },
      [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.5, y: 0.3 },
      [POSE_LANDMARKS.LEFT_ELBOW]: { x: 0.5, y: 0.55 }, // straight down from shoulder
    });
    const result = new FeedbackEngine(curl).evaluate(frame);
    expect(result.active.some((r) => r.id === "elbow_drift")).toBe(false);
  });
});
