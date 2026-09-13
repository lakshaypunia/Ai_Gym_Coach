"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CameraFeed } from "@/components/camera/CameraFeed";
import { RepCounter } from "@/components/hud/RepCounter";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { ExerciseSummary } from "@/lib/exercises/list";

export function WorkoutSession({ exercise }: { exercise: ExerciseSummary }) {
  const status = useSessionStore((state) => state.status);
  const cameraError = useSessionStore((state) => state.cameraError);
  const repCount = useSessionStore((state) => state.repCount);
  const setStatus = useSessionStore((state) => state.setStatus);
  const setCameraError = useSessionStore((state) => state.setCameraError);
  const setExerciseId = useSessionStore((state) => state.setExerciseId);
  const reset = useSessionStore((state) => state.reset);

  useEffect(() => {
    setExerciseId(exercise.id);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/workout" className="text-sm text-zinc-500 hover:underline">
            ← Back to exercises
          </Link>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{exercise.name}</h1>
        </div>
      </div>

      <div className="relative aspect-video w-full">
        <CameraFeed
          className="h-full w-full"
          onReady={() => {
            setCameraError(null);
            setStatus("camera-ready");
          }}
          onError={(message) => setCameraError(message)}
        />
        {status === "camera-ready" && <RepCounter count={repCount} />}
      </div>

      {status === "camera-error" && cameraError && (
        <p className="text-sm text-red-500">{cameraError}</p>
      )}

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pose detection, rep counting, and live feedback are coming in the next phase — for now this
        confirms the camera pipeline works end to end.
      </p>
    </div>
  );
}
