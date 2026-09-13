import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Matches the installed @mediapipe/tasks-vision version so the WASM runtime
// build is guaranteed compatible with the JS bindings we call against.
const WASM_BASE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

// Google's official hosted model — "lite" variant for the real-time path.
// Nothing here ever receives user video/landmark data; it's a one-time,
// cached static-asset download, same as a web font.
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function createLandmarker(delegate: "GPU" | "CPU"): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

/**
 * Lazily creates and caches a single PoseLandmarker instance for the whole
 * app. Prefers the GPU (WebGL) delegate, falling back to CPU if WebGL init
 * fails on the device/browser.
 */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker("GPU").catch((error) => {
      console.warn("PoseLandmarker: GPU delegate failed, falling back to CPU.", error);
      return createLandmarker("CPU");
    });
  }
  return landmarkerPromise;
}

export async function releasePoseLandmarker(): Promise<void> {
  const current = landmarkerPromise;
  landmarkerPromise = null;
  const landmarker = await current?.catch(() => null);
  landmarker?.close();
}
