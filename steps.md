# AI Gym Coach — Progress Tracker

Tracks implementation against `../plan.md`. Update this file whenever a phase's
scope changes or a checklist item is completed.

**Legend:** ✅ done · 🚧 in progress · ⬜ not started

---

## Phase 1 — Scaffolding ✅ (done 2026-09-13)

- ✅ Next.js 16 (App Router, TypeScript) + Tailwind v4 already scaffolded (create-next-app)
- ✅ Core deps installed: `zustand`, `@mediapipe/tasks-vision`, `@google/generative-ai`, `clsx`
- ✅ Project folders created: `components/{camera,hud,exercise,summary}`, `lib/{pose,geometry,exercises,audio,ai,store,storage}`, `types/`
- ✅ `types/pose.ts` — `Landmark`, `PoseFrame`
- ✅ `lib/store/sessionStore.ts` — Zustand store (status, camera error, rep count, feedback message)
- ✅ `components/camera/CameraFeed.tsx` — `getUserMedia` wrapper, permission states (requesting/ready/error), mirrored video, cleans up tracks on unmount
- ✅ `lib/exercises/list.ts` — lightweight exercise metadata for the picker (full FSM configs land in Phase 3's `configs.ts`)
- ✅ `app/workout/page.tsx` — exercise picker grid
- ✅ `app/workout/[exerciseId]/page.tsx` + `components/camera/WorkoutSession.tsx` — live session shell wired to `CameraFeed`, shows raw webcam feed + placeholder rep counter
- ✅ `app/page.tsx` — landing page replaced (was default create-next-app template)
- ✅ `app/layout.tsx` — metadata updated to "AI Gym Coach"
- ✅ `next.config.ts` — set `turbopack.root` (repo isn't a git repo yet, was causing a root-detection warning)
- ✅ `.env.local.example` — documents `GEMINI_API_KEY`
- ✅ Verified: `npx next typegen`, `tsc --noEmit`, `eslint .`, `next build` all clean

**Deviation from plan:** skipped `shadcn/ui` CLI (interactive installer, not viable non-interactively). Using hand-written Tailwind components for now — revisit if the UI needs more complex primitives (dialogs, dropdowns) in Phase 6.

**Manually verify before moving on:** run `npm run dev`, open `/workout`, click an exercise, and confirm the browser prompts for camera access and the mirrored feed renders. (Not yet done in this session — no browser available here.)

---

## Phase 2 — Pose Pipeline ✅ (done 2026-09-13)

- ✅ `lib/pose/poseLandmarker.ts` — singleton `PoseLandmarker` loader, GPU (WebGL) delegate with automatic CPU fallback, `runningMode: "VIDEO"`, cached across mounts so re-entering a session doesn't reload WASM
- ✅ Model + WASM runtime loaded from CDN (jsdelivr for the WASM fileset pinned to the installed `@mediapipe/tasks-vision@1.0.1`, Google's hosted `pose_landmarker_lite` model) — decided against self-hosting: the WASM bundle alone is ~34MB, too large to vendor into the repo/`public/`, and CDN static-asset downloads don't violate the "no video/landmark data leaves the browser" principle
- ✅ `components/camera/PoseCanvas.tsx` — canvas overlay using `requestVideoFrameCallback` (falls back to `requestAnimationFrame` if unsupported), synchronous `detectForVideo` per new frame, skeleton drawn imperatively via 2D canvas (no React state in the hot path); reports status (`loading-model`/`running`/`error`) and per-frame landmarks via callback props
- ✅ `lib/pose/smoothing.ts` — `LandmarkSmoother` (EMA, alpha configurable, default 0.4)
- ✅ Wired into `WorkoutSession.tsx` — skeleton overlay renders live once the camera is ready; shows a "Loading pose model…" chip and surfaces pose errors
- ✅ Verified: `npx next typegen`, `tsc --noEmit`, `eslint .`, `next build` all clean

**Manually verify before moving on:** run `npm run dev`, open a `/workout/[exerciseId]` session, and confirm the cyan/yellow skeleton overlay tracks your body in real time with no visible lag. (Not yet done in this session — no browser available here.)

## Phase 3 — Angle Engine + FSM ✅ (done 2026-09-13)

- ✅ `lib/geometry/angles.ts` — `angleBetweenPoints()` (law of cosines via dot product), `angleForJoint()`, `isJointVisible()`
- ✅ `lib/exercises/types.ts` — `ExerciseConfig`, `FormRule` (`JointTriple` moved to `lib/geometry/angles.ts` — see deviation note)
- ✅ `lib/exercises/configs.ts` — real `ExerciseConfig` for `bicep_curl` (left shoulder-elbow-wrist, 30°/160° thresholds per `plan.md` §6); `lib/exercises/list.ts` kept as-is for the picker UI (squat/pushup still listed there, just without an FSM config yet)
- ✅ `lib/exercises/fsm.ts` — `RepCounterFsm` class (idle→down→up cycle, rep counted only on down→up, debounce window, visibility-gated freeze)
- ✅ Wired into `WorkoutSession.tsx` — `onLandmarks` from `PoseCanvas` feeds the primary-joint angle into the FSM each frame; `repCompleted` increments the Zustand store's `repCount`, shown live by the existing `RepCounter` HUD
- ✅ Unit tests (`vitest`, newly added as a dev dependency — pinned to `^3.2.7`, not `5.x`, to avoid an `@types/node` peer conflict with this scaffold's `^20` pin): `lib/geometry/angles.test.ts` (90°/180°/0°/45° synthetic cases, symmetry, missing-landmark/visibility edge cases) and `lib/exercises/fsm.test.ts` (one-rep-per-cycle, no double-count on jitter, debounce, occlusion freeze, reset) — 15/15 passing
- ✅ Verified: `npx next typegen`, `tsc --noEmit`, `eslint .`, `npx vitest run`, `next build` all clean

**Bug caught by the FSM tests:** `RepCounterFsm.lastTransitionAt` was initialized to `0`, which collided with the debounce check whenever `nowMs` itself started near `0` — the very first transition out of `idle` could be silently swallowed. Fixed by initializing it to `-Infinity` instead. In production `nowMs` comes from `performance.now()` (time since page load), so this was a latent edge case rather than something that was actively misbehaving in Phase 2 — but worth having caught before it shipped.

**Deviation from plan:** `plan.md`'s file tree puts `JointTriple` in `lib/exercises/types.ts`. I moved it to `lib/geometry/angles.ts` instead, since it's fundamentally a geometry concept (3 landmark indices → an angle) and `angleForJoint()`/`isJointVisible()` need it directly. `lib/exercises/types.ts` now imports and re-exports it, so nothing importing `JointTriple` from `@/lib/exercises/types` breaks. This keeps the dependency direction natural: exercise-specific config depends on generic geometry, not the reverse.

**Manually verify before moving on:** run `npm run dev`, open `/workout/bicep_curl`, and do a few real curls to confirm the rep counter increments once per curl with no double-counts or missed reps. (Not yet done in this session — no browser available here; the FSM logic itself is covered by unit tests, but real landmark noise from an actual camera is the real test.)

### Post-Phase-3 smoothness pass (2026-09-13)

User tested in a real browser and reported it working but not smooth enough. Two changes, pulled forward from later plan phases:

- ✅ `lib/pose/smoothing.ts` — replaced the fixed-alpha EMA with a **One Euro filter** (adapts smoothing to movement speed instead of one fixed trade-off — see `TECHNICAL_DETAILS.md` §6). Added `lib/pose/smoothing.test.ts` (4 tests: passthrough on first sample, dampens held-still jitter, still tracks a real sustained movement, re-inits on landmark-count change).
- ✅ `components/camera/PoseCanvas.tsx` — detection now runs on a downscaled (≤480px long edge) offscreen canvas instead of the full 720p video frame, cutting model input pixels ~7× (`plan.md` §10's "downscale video input" optimization, pulled forward from Phase 7). Display/skeleton resolution and drawing precision are unaffected — only the model's input got smaller.
- ✅ `TECHNICAL_DETAILS.md` updated (§1, §5, §6, §10, §11, §12) to describe One Euro + the downscale instead of the old EMA/full-res approach.
- ✅ Verified: `npx vitest run` (19/19 passing), `tsc --noEmit`, `eslint .`, `next build` all clean.

**Still needs a real browser check:** whether this actually *feels* smoother is unverified from this session — worth trying `/workout/bicep_curl` again and reporting back.

## Phase 4 — Multi-exercise + Feedback + Voice Cues ⬜

- ⬜ Add `squat` and `pushup` configs
- ⬜ `lib/exercises/feedback.ts` — posture rule engine
- ⬜ `components/hud/FormFeedbackBanner.tsx`, `components/hud/AngleReadout.tsx`
- ⬜ `lib/audio/speak.ts` — Web Speech API wrapper w/ debounce
- ⬜ Wire live voice cues to FSM/feedback state transitions (not raw frames)

## Phase 5 — Gemini Coaching Layer ⬜

- ⬜ `lib/ai/geminiClient.ts`, `buildSummaryPrompt.ts`, `buildPlanPrompt.ts`
- ⬜ `app/api/feedback/route.ts`, `app/api/plan/route.ts`
- ⬜ `components/summary/SessionSummaryModal.tsx` (+ optional read-aloud), `SuggestedWorkoutCard.tsx`
- ⬜ Offline/failure fallback text for both AI routes
- ⬜ `GEMINI_API_KEY` documented + required in `.env.local`

## Phase 6 — UI Polish + History ⬜

- ⬜ `lib/storage/history.ts` — localStorage/IndexedDB read-write, `SessionRecord`
- ⬜ `app/history/page.tsx` — past sessions, stats, charts (`recharts`)
- ⬜ Revisit shadcn/ui decision from Phase 1 if needed

## Phase 7 — Optimization + Testing + Deploy ⬜

- ⬜ Performance pass (downscale model input, confirm GPU delegate + CPU fallback)
- ⬜ Cross-device / cross-lighting testing per plan §11
- ⬜ Vercel deploy with `GEMINI_API_KEY` env var

## Phase 8 (optional) — Accounts & Sync ⬜

- ⬜ Supabase auth + cross-device history sync
