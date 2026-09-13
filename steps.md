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

## Phase 3 — Angle Engine + FSM ⬜

- ⬜ `lib/geometry/angles.ts` — `angleBetweenPoints()` + unit tests (90°/180° synthetic cases)
- ⬜ `lib/exercises/types.ts` — `JointTriple`, `ExerciseConfig`, `FormRule`
- ⬜ `lib/exercises/configs.ts` — replace `lib/exercises/list.ts` with real configs (start with `bicep_curl`)
- ⬜ `lib/exercises/fsm.ts` — generic rep-counting state machine (debounce, visibility gate)
- ⬜ End-to-end: bicep curl rep counting works live

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
