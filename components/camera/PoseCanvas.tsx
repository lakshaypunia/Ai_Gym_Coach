"use client";

import { useEffect, useRef } from "react";
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { getPoseLandmarker } from "@/lib/pose/poseLandmarker";
import { LandmarkSmoother } from "@/lib/pose/smoothing";
import type { Landmark, PoseFrame } from "@/types/pose";

type PoseCanvasStatus = "loading-model" | "running" | "error";

interface PoseCanvasProps {
  video: HTMLVideoElement | null;
  active: boolean;
  onLandmarks?: (frame: PoseFrame | null) => void;
  onStatusChange?: (status: PoseCanvasStatus, error?: string) => void;
  className?: string;
}

const POINT_RADIUS = 4;
const LINE_WIDTH = 3;

export function PoseCanvas({ video, active, onLandmarks, onStatusChange, className }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!video || !active) return;

    const canvas = canvasRef.current;
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let rafHandle: number | null = null;
    let vfcHandle: number | null = null;
    let lastVideoTime = -1;
    const smoother = new LandmarkSmoother();

    onStatusChange?.("loading-model");

    getPoseLandmarker()
      .then((instance) => {
        if (cancelled) return;
        landmarker = instance;
        onStatusChange?.("running");
        scheduleNextFrame();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load the pose model.";
        onStatusChange?.("error", message);
      });

    function scheduleNextFrame() {
      if (cancelled || !video) return;
      const hasVfc = typeof video.requestVideoFrameCallback === "function";
      if (hasVfc) {
        vfcHandle = video.requestVideoFrameCallback(() => processFrame());
      } else {
        rafHandle = requestAnimationFrame(() => processFrame());
      }
    }

    function processFrame() {
      if (cancelled || !landmarker || !video) return;

      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        drawResult(result.landmarks[0] ?? null);
      }

      scheduleNextFrame();
    }

    function drawResult(rawLandmarks: Landmark[] | null) {
      if (!canvas || !video) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width === 0 || height === 0) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      if (!rawLandmarks) {
        smoother.reset();
        onLandmarks?.(null);
        return;
      }

      const landmarks = smoother.smooth(rawLandmarks);

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = LINE_WIDTH;
      for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
        const a = landmarks[start];
        const b = landmarks[end];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }

      ctx.fillStyle = "#facc15";
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      onLandmarks?.({ landmarks, timestampMs: performance.now() });
    }

    return () => {
      cancelled = true;
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      if (vfcHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(vfcHandle);
      }
      const ctx = canvas?.getContext("2d");
      ctx?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, active]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover ${className ?? ""}`}
    />
  );
}
