"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CameraFeed } from "@/components/camera/CameraFeed";
import { PoseCanvas } from "@/components/camera/PoseCanvas";
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

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [poseStatus, setPoseStatus] = useState<"loading-model" | "running" | "error">(
    "loading-model",
  );
  const [poseError, setPoseError] = useState<string | null>(null);

  useEffect(() => {
    setExerciseId(exercise.id);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const cameraReady = status === "camera-ready";

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
          onReady={(video) => {
            setCameraError(null);
            setStatus("camera-ready");
            setVideoEl(video);
          }}
          onError={(message) => setCameraError(message)}
        />

        {cameraReady && (
          <PoseCanvas
            video={videoEl}
            active={cameraReady}
            onStatusChange={(nextStatus, message) => {
              setPoseStatus(nextStatus);
              setPoseError(message ?? null);
            }}
          />
        )}

        {cameraReady && <RepCounter count={repCount} />}

        {cameraReady && poseStatus === "loading-model" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-zinc-200">
            Loading pose model…
          </div>
        )}
      </div>

      {status === "camera-error" && cameraError && (
        <p className="text-sm text-red-500">{cameraError}</p>
      )}

      {poseStatus === "error" && poseError && <p className="text-sm text-red-500">{poseError}</p>}

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Rep counting and live form feedback are coming in the next phase — for now this confirms
        the skeleton overlay tracks in real time.
      </p>
    </div>
  );
}
