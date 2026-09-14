"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CameraFeed } from "@/components/camera/CameraFeed";
import { PoseCanvas } from "@/components/camera/PoseCanvas";
import { RepCounter } from "@/components/hud/RepCounter";
import { FormFeedbackBanner } from "@/components/hud/FormFeedbackBanner";
import { AngleReadout } from "@/components/hud/AngleReadout";
import { SessionSummaryModal } from "@/components/summary/SessionSummaryModal";
import { useSessionStore } from "@/lib/store/sessionStore";
import { angleForJoint, isJointVisible } from "@/lib/geometry/angles";
import { getExerciseConfig } from "@/lib/exercises/configs";
import { RepCounterFsm } from "@/lib/exercises/fsm";
import { FeedbackEngine } from "@/lib/exercises/feedback";
import { speak } from "@/lib/audio/speak";
import type { ExerciseSummary } from "@/lib/exercises/list";
import type { FormRule } from "@/lib/exercises/types";
import type { SessionStats } from "@/lib/ai/types";
import type { PoseFrame } from "@/types/pose";

const ANGLE_READOUT_THROTTLE_MS = 150;

function formatJointLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickBannerRule(active: FormRule[]): FormRule | null {
  return active.find((rule) => rule.severity === "critical") ?? active[0] ?? null;
}

export function WorkoutSession({ exercise }: { exercise: ExerciseSummary }) {
  const status = useSessionStore((state) => state.status);
  const cameraError = useSessionStore((state) => state.cameraError);
  const repCount = useSessionStore((state) => state.repCount);
  const setStatus = useSessionStore((state) => state.setStatus);
  const setCameraError = useSessionStore((state) => state.setCameraError);
  const setExerciseId = useSessionStore((state) => state.setExerciseId);
  const incrementRep = useSessionStore((state) => state.incrementRep);
  const markSessionStarted = useSessionStore((state) => state.markSessionStarted);
  const recordViolation = useSessionStore((state) => state.recordViolation);
  const reset = useSessionStore((state) => state.reset);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [poseStatus, setPoseStatus] = useState<"loading-model" | "running" | "error">(
    "loading-model",
  );
  const [poseError, setPoseError] = useState<string | null>(null);
  const [bannerRule, setBannerRule] = useState<FormRule | null>(null);
  const [primaryAngle, setPrimaryAngle] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  const exerciseConfig = getExerciseConfig(exercise.id);
  const fsmRef = useRef<RepCounterFsm | null>(null);
  const feedbackEngineRef = useRef<FeedbackEngine | null>(null);
  const lastAngleUpdateAtRef = useRef(0);

  useEffect(() => {
    setExerciseId(exercise.id);
    fsmRef.current = exerciseConfig
      ? new RepCounterFsm(exerciseConfig.downThresholdDeg, exerciseConfig.upThresholdDeg)
      : null;
    feedbackEngineRef.current = exerciseConfig ? new FeedbackEngine(exerciseConfig) : null;
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  function handleLandmarks(frame: PoseFrame | null) {
    const fsm = fsmRef.current;
    if (!fsm || !exerciseConfig || !frame) return;

    const angle = angleForJoint(frame.landmarks, exerciseConfig.primaryJoint);
    if (angle === null) return;

    if (frame.timestampMs - lastAngleUpdateAtRef.current >= ANGLE_READOUT_THROTTLE_MS) {
      lastAngleUpdateAtRef.current = frame.timestampMs;
      setPrimaryAngle(angle);
    }

    const visible = isJointVisible(frame.landmarks, exerciseConfig.primaryJoint);
    const { repCompleted } = fsm.update(angle, visible, frame.timestampMs);
    if (repCompleted) {
      incrementRep();
      speak(String(useSessionStore.getState().repCount));
    }

    const feedback = feedbackEngineRef.current?.evaluate(frame);
    if (feedback) {
      setBannerRule(pickBannerRule(feedback.active));
      for (const rule of feedback.newlyViolated) {
        recordViolation(rule.id, rule.message);
        speak(rule.message);
      }
    }
  }

  function handleEndSession() {
    const state = useSessionStore.getState();
    const durationSec = state.sessionStartedAt ? (Date.now() - state.sessionStartedAt) / 1000 : 0;

    speak(`Set complete, ${state.repCount} reps`, { minGapMs: 0 });
    setSessionStats({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      totalReps: state.repCount,
      durationSec,
      formViolations: Object.values(state.violationCounts),
    });
  }

  const cameraReady = status === "camera-ready";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/workout"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back to exercises
          </Link>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-lg"
            >
              {exercise.icon}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
            {cameraReady && exerciseConfig && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Live
              </span>
            )}
          </div>
        </div>

        {cameraReady && exerciseConfig && repCount > 0 && (
          <button
            type="button"
            onClick={handleEndSession}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm shadow-accent/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            End session
          </button>
        )}
      </div>

      <div className="relative aspect-video w-full">
        <CameraFeed
          className="h-full w-full"
          onReady={(video) => {
            setCameraError(null);
            setStatus("camera-ready");
            setVideoEl(video);
            markSessionStarted();
          }}
          onError={(message) => setCameraError(message)}
        />

        {cameraReady && (
          <PoseCanvas
            video={videoEl}
            active={cameraReady}
            onLandmarks={handleLandmarks}
            onStatusChange={(nextStatus, message) => {
              setPoseStatus(nextStatus);
              setPoseError(message ?? null);
            }}
          />
        )}

        {cameraReady && exerciseConfig && <RepCounter count={repCount} />}

        {cameraReady && exerciseConfig && primaryAngle !== null && (
          <AngleReadout
            label={formatJointLabel(exerciseConfig.primaryJoint.label)}
            angleDeg={primaryAngle}
          />
        )}

        {cameraReady && bannerRule && (
          <FormFeedbackBanner message={bannerRule.message} severity={bannerRule.severity} />
        )}

        {cameraReady && poseStatus === "loading-model" && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-zinc-200 ring-1 ring-white/10 backdrop-blur-md">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            Loading pose model…
          </div>
        )}
      </div>

      {status === "camera-error" && cameraError && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{cameraError}</p>
      )}

      {poseStatus === "error" && poseError && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{poseError}</p>
      )}

      {exerciseConfig ? (
        <p className="text-sm text-muted">
          Rep counting, form feedback, and spoken cues are all live.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Rep counting for {exercise.name} isn&apos;t wired up yet — the skeleton overlay above
          still tracks in real time.
        </p>
      )}

      {sessionStats && (
        <SessionSummaryModal
          stats={sessionStats}
          onClose={() => {
            setSessionStats(null);
            setBannerRule(null);
            setPrimaryAngle(null);
            fsmRef.current?.reset();
            feedbackEngineRef.current?.reset();
            reset();
            setStatus("camera-ready");
            markSessionStarted();
          }}
        />
      )}
    </div>
  );
}
