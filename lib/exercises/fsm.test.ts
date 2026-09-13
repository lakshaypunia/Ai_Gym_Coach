import { describe, expect, it } from "vitest";
import { RepCounterFsm } from "./fsm";

const DOWN = 30;
const UP = 160;

describe("RepCounterFsm", () => {
  it("counts exactly one rep per full down-to-up-to-down cycle", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 0);
    let t = 0;
    const results = [
      fsm.update(170, true, (t += 100)), // idle -> up (no rep)
      fsm.update(20, true, (t += 100)), // up -> down (no rep)
      fsm.update(170, true, (t += 100)), // down -> up (rep!)
    ];
    expect(results.map((r) => r.repCompleted)).toEqual([false, false, true]);
    expect(fsm.getPhase()).toBe("up");
  });

  it("does not count a rep on the up -> down transition", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 0);
    let t = 0;
    fsm.update(20, true, (t += 100)); // idle -> down
    const { repCompleted } = fsm.update(170, true, (t += 100)); // down -> up
    expect(repCompleted).toBe(true);
    const goingBackDown = fsm.update(20, true, (t += 100)); // up -> down
    expect(goingBackDown.repCompleted).toBe(false);
  });

  it("does not double-count when the angle jitters around a threshold mid-phase", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 0);
    let t = 0;
    let repsCompleted = 0;
    fsm.update(20, true, (t += 100)); // idle -> down
    for (const angle of [40, 60, 45, 90, 70, 170]) {
      const { repCompleted } = fsm.update(angle, true, (t += 20));
      if (repCompleted) repsCompleted += 1;
    }
    expect(repsCompleted).toBe(1);
  });

  it("ignores transitions faster than the debounce window", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 150);
    fsm.update(20, true, 0); // idle -> down at t=0
    const tooSoon = fsm.update(170, true, 50); // only 50ms later
    expect(tooSoon.repCompleted).toBe(false);
    expect(fsm.getPhase()).toBe("down");

    const afterDebounce = fsm.update(170, true, 200); // 200ms after the down transition
    expect(afterDebounce.repCompleted).toBe(true);
    expect(fsm.getPhase()).toBe("up");
  });

  it("freezes and ignores transitions while the joint is not visible", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 0);
    let t = 0;
    fsm.update(20, true, (t += 100)); // idle -> down
    const occluded = fsm.update(170, false, (t += 100)); // would trigger a rep, but occluded
    expect(occluded.repCompleted).toBe(false);
    expect(fsm.getPhase()).toBe("down");

    const visibleAgain = fsm.update(170, true, (t += 100));
    expect(visibleAgain.repCompleted).toBe(true);
  });

  it("resets back to idle", () => {
    const fsm = new RepCounterFsm(DOWN, UP, 0);
    fsm.update(20, true, 0);
    fsm.update(170, true, 100);
    expect(fsm.getPhase()).toBe("up");
    fsm.reset();
    expect(fsm.getPhase()).toBe("idle");
  });
});
