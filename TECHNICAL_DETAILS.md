# AI Gym Coach — Technical Deep Dive

A step-by-step explanation of how each part of the system actually works, for
whoever needs to explain, defend, or extend this project. Written against the
code as it exists after Phase 3 (camera → pose tracking → rep counting).
Cross-references `plan.md` (the original design) and `steps.md` (build
progress) — this file explains the *how* and *why* behind what's checked off
there.

---

## 1. The pipeline, end to end

```
Webcam ──▶ <video> element ──▶ PoseLandmarker (MediaPipe) ──▶ 33 landmarks
                                                                    │
                                                                    ▼
                                                    One Euro smoothing
                                                                    │
                                                                    ▼
                                                    angleBetweenPoints()
                                                    (shoulder-elbow-wrist)
                                                                    │
                                                                    ▼
                                                      RepCounterFsm.update()
                                                                    │
                                                          rep completed? ──▶ Zustand store ──▶ RepCounter HUD
```

Everything above the Zustand store runs **entirely in the browser, per video
frame, client-side**. No frame, landmark, or angle ever gets sent to a
server — that's a deliberate architectural choice from `plan.md` §2, not an
accident. Later phases (Gemini coaching) only ever send small aggregated
stats (`{ totalReps: 15, formViolations: [...] }`), never video or pose data.

---

## 2. Camera capture — `components/camera/CameraFeed.tsx`

The browser API for accessing a webcam is
[`navigator.mediaDevices.getUserMedia()`](https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia).
It's a **promise-based, permission-gated** API:

1. The browser shows a permission prompt the first time a site asks.
2. If granted, the promise resolves with a `MediaStream` — a live handle to
   the camera's video (and/or audio) track.
3. That stream is attached to an `<video>` element via `video.srcObject = stream`,
   and `video.play()` starts it rendering.

`CameraFeed.tsx` wraps this in a small state machine of its own
(`"requesting" | "ready" | "error"`) so the UI can show a spinner while
permission is pending and a specific, human-readable message if it's denied
(`NotAllowedError`), no camera exists (`NotFoundError`), or another app has
the camera locked (`NotReadableError`) — these are real `DOMException` names
the browser throws, mapped in `getCameraErrorMessage()`.

**Cleanup matters here.** A `MediaStream` keeps the camera's hardware light
on and the OS-level camera lock held until every track is explicitly
stopped. The `useEffect` cleanup function calls
`stream.getTracks().forEach(track => track.stop())` so navigating away from a
workout session actually releases the camera — otherwise it would stay "in
use" even after leaving the page.

**Mirroring.** The video is displayed with a CSS `-scale-x-100` transform, so
it behaves like a mirror (raise your right hand, see it on the right side of
the frame) — the natural expectation for a self-facing camera UI. Critically,
this is a **display-only** transform; the actual pixel data MediaPipe reads
from the `<video>` element is *not* mirrored. This matters for landmark
labels — see §8.

---

## 3. Client state — `lib/store/sessionStore.ts` (Zustand)

A single small [Zustand](https://github.com/pmndrs/zustand) store holds
session-wide state: camera/pose status, the current exercise id, the rep
count, and (later) feedback messages. Zustand was chosen over React Context
because:

- Components can subscribe to *one field* (`useSessionStore(s => s.repCount)`)
  without re-rendering when unrelated fields change — Context re-renders every
  consumer on any change unless you split it into many providers.
- No provider wrapping needed — it's just a hook, importable anywhere,
  including inside the imperative per-frame loop in `PoseCanvas.tsx` if
  needed later.

This keeps the real-time camera/canvas rendering path (which runs imperative,
outside React's render cycle — see §5) decoupled from the HUD, which *is*
plain React and re-renders normally off the store.

---

## 4. The pose estimation engine

This is the core of the app: turning a video frame into 33 body coordinates.
It's built on **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`), Google's
JS/WASM port of the same MediaPipe Pose (BlazePose) model used in the
original Python/OpenCV version of this project.

### 4a. WebAssembly (WASM) — why it exists here

MediaPipe's actual detection engine is a large C++ codebase (tensor math,
graph execution, the works). Plain JavaScript is far too slow to run a neural
network's matrix multiplications frame-by-frame in real time. **WebAssembly**
is a binary instruction format that lets that C++ code be compiled once and
then run in any browser at near-native speed — it's not a new language, it's
a compilation *target*, the same way you'd compile C++ to x86 machine code,
except this "machine code" runs inside the browser's sandboxed VM.

The npm package ships this as `.wasm` binary files (in
`node_modules/@mediapipe/tasks-vision/wasm/`, **~34MB** across the SIMD,
non-SIMD, and threaded variants). That's too large to commit into the repo or
serve from `public/`, so `lib/pose/poseLandmarker.ts` loads it from a CDN
(jsdelivr) instead, pinned to the exact installed package version
(`1.0.1`) so the WASM binary and the JS bindings calling into it are
guaranteed compatible:

```ts
const WASM_BASE_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
```

`FilesetResolver.forVisionTasks(WASM_BASE_PATH)` fetches and boots this
runtime. This download only happens once (the browser caches it), and it's a
static asset fetch — no user data goes out over that request, the same as
loading a web font from Google Fonts.

### 4b. The model itself — `PoseLandmarker`

The WASM runtime is a generic execution engine; it needs an actual trained
model to run. That's the second download:

```ts
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
```

This `.task` file contains the **BlazePose** neural network's trained
weights. Given a single image/frame, it outputs up to `numPoses` detected
people, each as **33 landmarks** — nose, eyes, ears, shoulders, elbows,
wrists, fingers, hips, knees, ankles, heels, and foot indices — each with:

```ts
{ x: number, y: number, z: number, visibility: number }
```

`x`/`y` are normalized 0–1 across the frame width/height; `z` is a rough
depth estimate (less reliable from a single camera, so this project ignores
it — see §7); `visibility` (0–1) is the model's own confidence that this
landmark is actually visible (not occluded by clothing, the edge of frame,
another body part, etc.) — this is what drives the occlusion guard in §9.

Google publishes three sizes of this model — **lite**, **full**, and
**heavy** — trading accuracy for speed. This project uses **lite**, per
`plan.md` §10, because the real-time loop needs to sustain 30 fps; "heavy" is
meant for offline, one-shot, high-accuracy use, not a live camera loop.

### 4c. GPU vs CPU "delegate"

A **delegate** is MediaPipe's term for *which hardware actually executes the
model's math*:

| Delegate | How it runs | Speed | Availability |
|---|---|---|---|
| **GPU** | Compiles the model's operations into WebGL shaders, runs on the graphics card | Fast — GPUs are built for exactly this kind of massively parallel matrix math | Needs a working WebGL context; can fail on some VMs, old drivers, or browsers with WebGL disabled |
| **CPU** | Runs the same math via WASM SIMD instructions on the CPU | Slower, but still usable at reasonable resolutions | Works essentially everywhere |

`getPoseLandmarker()` tries GPU first, and if `PoseLandmarker.createFromOptions`
throws (WebGL init failure), it **catches that and silently retries on CPU**:

```ts
landmarkerPromise = createLandmarker("GPU").catch((error) => {
  console.warn("PoseLandmarker: GPU delegate failed, falling back to CPU.", error);
  return createLandmarker("CPU");
});
```

The result is cached (module-level `landmarkerPromise` singleton) so
navigating between workout sessions doesn't reload the ~34MB WASM runtime and
model every time — only the very first session pays that cost.

### 4d. Running mode & `detectForVideo`

The model can run in `"IMAGE"` mode (one-shot, for a single photo) or
`"VIDEO"` mode (optimized for a stream of frames, allows the model to use
temporal information between frames for more stable tracking). This project
always uses `"VIDEO"`. `detectForVideo(video, timestampMs)` is **synchronous**
— it returns a `PoseLandmarkerResult` directly, not a `Promise` — which
matters for how the render loop in §5 is structured (no `await` needed inside
the hot per-frame path).

---

## 5. Drawing the skeleton — `components/camera/PoseCanvas.tsx`

This component runs a **manual render loop**, deliberately outside React's
normal render cycle:

1. **Frame scheduling.** It prefers
   [`video.requestVideoFrameCallback()`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) —
   a newer API that fires exactly when a *new decoded video frame* is ready
   to be presented, which is more frame-accurate than the generic
   `requestAnimationFrame` (which fires on the display's refresh rate,
   independent of whether the video actually produced a new frame). Falls
   back to `requestAnimationFrame` on browsers without it.
2. **Duplicate-frame guard.** `video.currentTime` is compared against the
   last-processed value (`lastVideoTime`) so the same decoded frame is never
   run through the model twice if the callback fires faster than the video's
   own frame rate.
3. **Downscale before detecting.** The captured video runs at up to 1280×720,
   but the model doesn't need that many pixels to find landmarks — every
   frame is first drawn onto a small offscreen `<canvas>` capped at 480px on
   the long edge (`computeDetectionSize()`) via `ctx.drawImage(video, 0, 0, w, h)`,
   and *that* downscaled canvas — not the raw video — is what's passed to
   `detectForVideo()`. This cuts the pixels the model has to process by
   roughly 7× for a 720p source, which matters most on the CPU delegate
   fallback (§4c). It doesn't touch the on-screen video's sharpness, and it
   doesn't lose any *drawing* precision either — MediaPipe always returns
   landmarks normalized to 0..1 regardless of input resolution, so mapping
   them back onto the full-resolution display canvas in step 5 is exactly as
   precise as if detection had run on the full frame; only the model's
   *input* got smaller, not its coordinate system.
4. **Detect.** `landmarker.detectForVideo(detectionCanvas, timestamp)` runs
   inference on that downscaled frame.
5. **Draw imperatively.** The result is drawn straight onto a `<canvas>` via
   the 2D context (`ctx.moveTo`/`lineTo`/`arc`) — connecting lines using
   `PoseLandmarker.POSE_CONNECTIONS` (a static array of `{start, end}`
   landmark-index pairs Google ships for exactly this purpose) and a dot per
   landmark. **No React state changes here** — triggering a React re-render
   30+ times a second just to move some canvas pixels would be wasteful;
   `plan.md` §10 calls this out explicitly ("only rep count / feedback text
   trigger React state updates").
6. **Report upward.** Once drawn, the smoothed landmarks are handed to the
   parent via the `onLandmarks` callback prop — this is how `WorkoutSession.tsx`
   gets the data it needs for angle/rep-counting (§9) without the hot loop
   itself knowing anything about exercises or FSMs.

The canvas is sized to the video's *native* resolution
(`video.videoWidth`/`videoHeight`, e.g. 1280×720) and then CSS-stretched to
fill its container with the same `object-cover` + mirrored transform as the
`<video>` element underneath it — so the drawn skeleton lines up with the
person on screen.

---

## 6. Landmark smoothing — `lib/pose/smoothing.ts`

Raw landmark coordinates jitter slightly frame to frame, even when you're
holding still — sensor/model noise, not real movement. Left unfiltered, this
jitter can cause the angle computed in §7 to wobble across a rep-counting
threshold and register a false rep.

`LandmarkSmoother` runs an independent **One Euro Filter**
([Casiez, Roussel & Vogel, 2012](https://cristal.univ-lille.fr/~casiez/1euro/))
per landmark, per axis (`x`/`y`/`z`). A first pass at this used a plain fixed
exponential moving average (EMA) — `smoothed = smoothed + alpha × (raw -
smoothed)` — but a *fixed* `alpha` forces one trade-off for every situation:
turn it up and held-still landmarks stay jittery; turn it down and a fast rep
visibly lags behind the real movement. One Euro fixes this by adapting the
smoothing amount to how fast the point is currently moving:

1. It low-pass filters the signal's own **derivative** (its velocity) first.
2. It uses that estimated speed to pick the cutoff frequency for smoothing
   the actual value: `cutoff = minCutoff + beta × |velocity|` — nearly still
   → low cutoff → heavy smoothing (kills jitter); moving fast → high cutoff →
   light smoothing (stays responsive, no lag).

```ts
const cutoff = this.minCutoff + this.beta * Math.abs(dxSmoothed);
const xSmoothed = lowPass(x, this.xPrev, alpha(cutoff, dt));
```

`minCutoff` and `beta` are tuned for landmarks' normalized 0..1 coordinate
space (not the pixel-scale defaults from the original paper's mouse-tracking
demo, which assume velocities in the hundreds). `smoother.reset()` is called
whenever a frame has no detected person, so the filter doesn't "remember" a
stale position (and a stale velocity estimate) across a gap in detection.

---

## 7. Angle geometry — `lib/geometry/angles.ts`

Every exercise's rep counting boils down to one number per frame: **the
angle at a joint**, e.g. the elbow angle formed by the shoulder, elbow, and
wrist. Given three points `A` (shoulder), `B` (elbow, the vertex), `C`
(wrist), the angle **∠ABC** is computed via the dot-product form of the law
of cosines:

```
BA = A - B                    (vector from elbow to shoulder)
BC = C - B                    (vector from elbow to wrist)

cos θ = (BA · BC) / (|BA| × |BC|)

θ = arccos(cos θ) × (180 / π)
```

In code:

```ts
export function angleBetweenPoints(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  const cos = Math.min(1, Math.max(-1, dot / (magBA * magBC)));
  return (Math.acos(cos) * 180) / Math.PI;
}
```

A few details worth calling out:

- **Only `x`/`y` are used**, not `z`. MediaPipe's depth (`z`) estimate from a
  single 2D camera is comparatively noisy/unreliable (no true stereo depth),
  so this project sticks to 2D angles — the same simplification the original
  Python/OpenCV synopsis made.
- **Clamping `cos` to `[-1, 1]`** before calling `Math.acos` guards against
  floating-point rounding pushing the value very slightly outside that
  domain (e.g. `1.0000000002`), which would otherwise make `Math.acos`
  return `NaN`.
- This is verified with unit tests (`lib/geometry/angles.test.ts`) against
  known synthetic geometry: a perfect right angle → `90°`, a straight line →
  `180°`, overlapping vectors → `0°`, and a known 45° diagonal — plus a
  symmetry check (`angle(A,B,C) === angle(C,B,A)`, since swapping which arm
  is "first" shouldn't change the angle between them).

`angleForJoint(landmarks, jointTriple)` resolves a `JointTriple` (three
landmark *indices*, defined per exercise — see §8) against a specific
frame's landmark array and returns the angle, or `null` if any of the three
weren't detected that frame. `isJointVisible(...)` separately checks that all
three landmarks meet a minimum `visibility` score (default `0.5`) — this
feeds the occlusion guard in §9.

---

## 8. Exercise configuration — `lib/exercises/configs.ts`

MediaPipe's pose model always returns landmarks in the same fixed order (the
**BlazePose 33-point layout**). The indices this project currently uses:

| Index | Landmark | Index | Landmark |
|---|---|---|---|
| 11 | left shoulder | 12 | right shoulder |
| 13 | left elbow | 14 | right elbow |
| 15 | left wrist | 16 | right wrist |
| 23 | left hip | 24 | right hip |
| 25 | left knee | 26 | right knee |
| 27 | left ankle | 28 | right ankle |

**Important:** "left"/"right" here are **anatomical** (the performer's own
left/right), not camera-left/camera-right. This is why mirroring the
`<video>` display via CSS (§2) doesn't break anything — the model reads the
raw, unmirrored pixel data, correctly identifies *your* left arm as
`left_*`, and the CSS mirror only affects what's drawn on screen, which
still lines up because the skeleton overlay gets the identical mirror
transform.

An `ExerciseConfig` (`lib/exercises/types.ts`) bundles everything a single
exercise needs:

```ts
export interface ExerciseConfig {
  id: string;
  name: string;
  primaryJoint: JointTriple;       // drives rep counting
  secondaryJoints?: JointTriple[]; // form-rule checks only (Phase 4)
  downThresholdDeg: number;        // angle below this = "contracted"
  upThresholdDeg: number;          // angle above this = "extended"
  formRules: FormRule[];           // posture checks (Phase 4)
}
```

The current `bicep_curl` config tracks the **left shoulder → elbow → wrist**
angle, with thresholds taken directly from `plan.md` §6: below `30°` counts
as fully curled ("down" phase), above `160°` counts as fully extended ("up"
phase).

---

## 9. The rep-counting state machine — `lib/exercises/fsm.ts`

Counting reps isn't just "did the angle cross a threshold" — a single
noisy frame crossing a line shouldn't register a rep, and a rep should only
count once per full contract-then-extend cycle, not twice. `RepCounterFsm`
implements exactly the 3-state machine from `plan.md` §7:

```
idle ──(angle ≤ downThreshold)──▶ down
down ──(angle ≥ upThreshold)────▶ up   ──▶ rep counted here
up   ──(angle ≤ downThreshold)──▶ down
```

A rep is deliberately only counted on the **down → up** transition — one
full "curl up" completes one rep; the return back down doesn't count a
second one.

Two guards prevent false positives:

- **Debounce window** (default 150ms): any state transition happening
  sooner than `debounceMs` after the previous one is ignored outright. This
  filters out a single noisy frame flipping the angle across a threshold and
  immediately flipping back — a real rep physically can't complete a full
  phase change in a handful of milliseconds.
- **Visibility gate**: the caller (`WorkoutSession.tsx`) checks
  `isJointVisible()` (§7) each frame and passes that boolean in. If the
  joint isn't reliably visible (e.g. the elbow is out of frame or occluded),
  the FSM **freezes** — it ignores the update entirely rather than trusting
  a potentially garbage angle computed from a low-confidence landmark.

This is covered by `lib/exercises/fsm.test.ts` — including a real bug this
testing caught: `lastTransitionAt` was originally initialized to `0`, which
collided with the debounce check whenever the very first update happened at
a `nowMs` close to `0` (exactly what the test harness does, and a real if
rare edge case in production if pose detection started within 150ms of page
load). Fixed by initializing it to `-Infinity` instead, so the very first
transition is never accidentally debounced away.

---

## 10. Putting it all together — one frame, start to finish

Concretely, here's everything that happens for a single video frame once a
workout session is live:

1. `PoseCanvas`'s frame callback fires (`requestVideoFrameCallback`).
2. The current video frame is drawn onto a small offscreen canvas, downscaled
   to ≤480px on the long edge (§5, step 3).
3. `landmarker.detectForVideo(detectionCanvas, timestamp)` → 33 raw landmarks.
4. `LandmarkSmoother.smooth()` runs each landmark through its One Euro filter
   against its previous state.
5. The skeleton is drawn on the (full-resolution) display canvas (connections
   + dots).
6. The smoothed landmarks + timestamp are handed to `WorkoutSession.handleLandmarks()`
   via the `onLandmarks` callback.
7. `angleForJoint(landmarks, exerciseConfig.primaryJoint)` computes the
   shoulder-elbow-wrist angle for this frame.
8. `isJointVisible(...)` checks whether that computation should even be
   trusted this frame.
9. `RepCounterFsm.update(angle, visible, timestamp)` advances the state
   machine (or freezes it, per the guards in §9).
10. If it reports `repCompleted: true`, `useSessionStore().incrementRep()` is
    called, bumping the Zustand store's `repCount`.
11. The `RepCounter` HUD component (plain React, subscribed to
    `state.repCount`) re-renders with the new number.

Steps 1–9 happen entirely outside React's render cycle (imperative canvas +
plain function calls); only step 11 is a "normal" React re-render — and it
only happens when a rep actually completes, not 30 times a second.

---

## 11. Testing strategy so far

Per `plan.md` §11, the parts that are pure logic (no camera/DOM needed) are
covered by unit tests (`vitest`, run via `npm run test`):

- **`lib/geometry/angles.test.ts`** — synthetic coordinate geometry (known
  90°/180°/0°/45° cases), symmetry, and missing-landmark/low-visibility edge
  cases.
- **`lib/exercises/fsm.test.ts`** — one rep per full cycle, no double-count
  on mid-phase jitter, debounce behavior, occlusion freeze/resume, and
  reset.
- **`lib/pose/smoothing.test.ts`** — the One Euro filter passes the first
  sample through unchanged, meaningfully dampens synthetic jitter around a
  held position, still converges to a real sustained movement instead of
  staying permanently lagged, and re-initializes cleanly if the landmark
  count changes.

What's *not* yet covered (deferred to later phases, or requiring an actual
browser + camera to verify): real landmark noise from a live camera feed,
cross-device/cross-lighting behavior, voice cue timing, and the Gemini API
integration's failure fallbacks. `steps.md` tracks these explicitly under
each phase's "manually verify before moving on" note.

---

## 12. Key engineering decisions (and where they deviate from `plan.md`)

- **CDN-hosted WASM + model, not self-hosted in `public/`.** The WASM bundle
  alone is ~34MB — too large to commit to the repo. `plan.md` §4 listed
  self-hosting as an *optional* structure (`public/models/`); CDN loading
  (pinned to the exact installed package version) was chosen as the default
  instead, consistent with how every official MediaPipe web demo does it.
- **`JointTriple` lives in `lib/geometry/angles.ts`, not `lib/exercises/types.ts`**
  (where `plan.md`'s file tree originally placed it). It's fundamentally a
  geometry concept — three landmark indices that define an angle — and the
  angle-resolution helpers need it directly. `lib/exercises/types.ts` still
  imports and re-exports it, so nothing that expected it there breaks; this
  just keeps the dependency direction natural (exercise config depends on
  generic geometry, not the other way around).
- **`shadcn/ui` skipped for now.** Its setup is an interactive CLI installer,
  not viable to run non-interactively in this environment. Hand-written
  Tailwind components are used instead; revisit if Phase 6 (history/charts,
  more complex UI primitives like modals/dropdowns) needs more than that.
- **`vitest` pinned to `^3.2.7`, not `5.x`.** `vitest@5` requires
  `@types/node@^22 || >=24`, which conflicts with this scaffold's
  `@types/node@^20` pin. `vitest@3` supports `^20` directly, avoiding an
  unrelated dependency bump just to add a test runner.
- **Smoothing upgraded from a fixed-alpha EMA to a One Euro filter, and
  detection input downscaled to ≤480px**, after initial hands-on testing felt
  jittery/less smooth than desired. `plan.md` §4 listed "EMA/one-euro filter"
  as alternatives up front; One Euro was the better fit specifically because
  it adapts to movement speed instead of committing to one fixed smoothing
  amount for both "holding still" and "mid-rep" (see §6). The detection
  downscale is `plan.md` §10's "downscale video input fed to the model"
  optimization, pulled forward from its originally planned Phase 7 slot
  because it directly improves per-frame latency, which is part of the same
  "smoothness" complaint.

---

## 13. What's next (Phase 4+)

Per `steps.md`: squat/push-up `ExerciseConfig`s, the posture-correction
`FormRule` engine (`lib/exercises/feedback.ts`), live spoken cues on rep/form
transitions (`lib/audio/speak.ts`, Web Speech API), and eventually the
Gemini-powered post-workout summary and next-workout suggestion (Phase 5) —
all layered on top of the same per-frame pipeline described in §10 without
changing its shape: feedback rules and voice cues hook into the *same*
FSM/angle events, not raw per-frame landmarks.
