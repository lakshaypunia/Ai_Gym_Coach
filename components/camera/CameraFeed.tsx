"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

type CameraFeedStatus = "requesting" | "ready" | "error";

interface CameraFeedProps {
  onReady?: (video: HTMLVideoElement) => void;
  onError?: (message: string) => void;
  className?: string;
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera access was denied. Allow camera permissions in your browser and try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found on this device.";
      case "NotReadableError":
      case "TrackStartError":
        return "The camera is already in use by another application.";
      default:
        return `Could not access the camera (${error.name}).`;
    }
  }
  return "Could not access the camera.";
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed({ onReady, onError, className }, forwardedRef) {
    const internalRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<CameraFeedStatus>("requesting");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;

      async function startCamera() {
        setStatus("requesting");
        setErrorMessage(null);

        if (!navigator.mediaDevices?.getUserMedia) {
          const message = "This browser does not support camera access.";
          if (!cancelled) {
            setStatus("error");
            setErrorMessage(message);
            onError?.(message);
          }
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          const video = internalRef.current;
          if (video) {
            video.srcObject = stream;
            await video.play();
            setStatus("ready");
            onReady?.(video);
          }
        } catch (error) {
          if (!cancelled) {
            const message = getCameraErrorMessage(error);
            setStatus("error");
            setErrorMessage(message);
            onError?.(message);
          }
        }
      }

      startCamera();

      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className={`relative overflow-hidden rounded-xl bg-black ${className ?? ""}`}>
        <video
          ref={(node) => {
            internalRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          className="h-full w-full -scale-x-100 object-cover"
          playsInline
          muted
        />

        {status === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-zinc-200">
            Requesting camera access…
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center text-sm text-red-300">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  },
);
