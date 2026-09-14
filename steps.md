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

**Confirmed by user (2026-09-13):** tested live, "it is working good" — smoothness pass accepted, no further tuning requested.

## Phase 4 — Multi-exercise + Feedback + Voice Cues ✅ (done 2026-09-13)

- ✅ Added `squat` and `pushup` `ExerciseConfig`s to `lib/exercises/configs.ts` (thresholds per `plan.md` §6: squat 100°/165° on left hip-knee-ankle, push-up 90°/160° on left shoulder-elbow-wrist)
- ✅ Form rules for all three exercises (heuristic, see note below): bicep curl `elbow_drift` (shoulder-hip-elbow angle, torso drift), squat `knee_valgus` (knee-width/ankle-width ratio, gated to only check while actually bent) + `torso_lean` (shoulder-hip-knee angle), push-up `hip_sag` (shoulder-hip-ankle body-line angle)
- ✅ `lib/exercises/feedback.ts` — `FeedbackEngine` class: computes primary+secondary joint angles once per frame, runs all of an exercise's `formRules` against them, and — like the FSM — tracks false→true transitions separately from "still active" so callers only get a *new* violation once, not every frame it holds
- ✅ `components/hud/FormFeedbackBanner.tsx` (severity-colored pill, top-center) and `components/hud/AngleReadout.tsx` (top-right, primary joint angle in degrees)
- ✅ `lib/audio/speak.ts` — Web Speech API wrapper per `plan.md` §8 (debounced via `minGapMs`, SSR-safe `typeof window` guard since this is imported from a `"use client"` file that Next still pre-renders server-side once)
- ✅ Wired into `WorkoutSession.tsx`: rep completion speaks the new rep count (reads `useSessionStore.getState().repCount` right after `incrementRep()` rather than threading the new value through separately); newly-violated form rules speak their message; the angle readout is throttled to update state at most every 150ms (not every frame) to avoid unnecessary re-renders on a fast-changing number
- ✅ Unit tests: `lib/exercises/feedback.test.ts` (10 tests — `FeedbackEngine` new-vs-still-active tracking and reset, plus real geometry cases for all three exercises' form rules, both triggering and non-triggering)
- ✅ Verified: `npx next typegen`, `tsc --noEmit`, `eslint .`, `npx vitest run` (29/29 passing), `next build` all clean

**Be honest about the form-rule thresholds:** `knee_valgus`'s width-ratio cutoff (`0.8`), `torso_lean`'s angle cutoff (`60°`), and `hip_sag`'s cutoff (`160°`) are reasonable starting heuristics, not values tuned against real recorded reps — they were picked so the *logic* is demonstrably correct (verified by synthetic-geometry unit tests) and are very likely to need adjustment once tested against an actual camera and body. Flag this if evaluated academically — the mechanism is real, the exact numbers are placeholders.

**Manually verify before moving on:** run `npm run dev` and try all three exercises — confirm reps count, a spoken number is heard on each rep, deliberately breaking form (e.g. flaring the elbow on a curl, caving the knees on a squat) shows the banner and triggers a spoken cue once (not repeatedly while held), and the angle readout updates smoothly without visibly janking the video. (Not yet done in this session — no browser available here.)

## Phase 5 — Gemini Coaching Layer ✅ (done 2026-09-14)

- ✅ `lib/ai/geminiClient.ts` — **Vertex AI**, not the plain Gemini Developer API `plan.md` §9 assumed (see deviation note below). Lazily creates a cached `GenerativeModel`, auth'd via a GCP service account key; `extractResponseText()` manually pulls text out of the response (this SDK has no `.text()` convenience helper)
- ✅ `lib/ai/buildSummaryPrompt.ts`, `buildPlanPrompt.ts` — prompts adapted from `plan.md` §9a/§9b; `buildPlanPrompt` explicitly branches on empty history (see Phase 6 note below) rather than letting Gemini guess from `[]`
- ✅ `app/api/feedback/route.ts`, `app/api/plan/route.ts` — call Gemini, `try/catch` to a rule-based fallback string on any failure (network, auth, empty response), same shape either way (`{ feedback }` / `{ plan }`, plus `fallback: true` when it's the fallback)
- ✅ `components/summary/SessionSummaryModal.tsx` — opens on "End session", fetches `/api/feedback`, loading state, "Play" button (reads the summary aloud via `speak()`, bypassing its debounce since it's a fresh deliberate click)
- ✅ `components/summary/SuggestedWorkoutCard.tsx` — on the landing page, fetches `/api/plan`
- ✅ Offline/failure fallback text implemented for both routes (server-side `try/catch`) *and* client-side (`SessionSummaryModal`/`SuggestedWorkoutCard` also catch fetch failures and show a hardcoded fallback) — double-covered per `plan.md` §9's "never feels broken without connectivity"
- ✅ "End session" button + flow added to `WorkoutSession.tsx`: speaks "Set complete, N reps" (the one voice cue deferred from Phase 4), collects `SessionStats` (reps, duration via new `sessionStartedAt` store field, form-violation counts via new `recordViolation`/`violationCounts` store fields), shows the modal; closing it resets the FSM/feedback engine/store and restarts the timer so another set can start without leaving the page
- ✅ Verified: `npx next typegen`, `tsc --noEmit`, `eslint .`, `npx vitest run` (29/29 passing), `next build` all clean

**Deviation from plan — Vertex AI, not the Gemini Developer API:** the credential the user provided (`secrets.json`) is a GCP **service account key** (`private_key`, `client_email`, `type: "service_account"`), not a plain API key string. A service account key is Vertex AI's auth mechanism; the Gemini Developer API `plan.md` §9 assumed uses a simple `GEMINI_API_KEY` string with the `@google/generative-ai` SDK instead. Implemented against `@google-cloud/vertexai` to match the credential actually given. Full explanation in `TECHNICAL_DETAILS.md` §16.

**Security note:** `secrets.json` was immediately added to `.gitignore` (it wasn't ignored by the existing `.env*` pattern) before any other Phase 5 work — confirmed untracked and ignored via `git check-ignore` before proceeding. `secrets.example.json` (committed, no real values) documents the expected shape.

**No persisted history yet:** `SuggestedWorkoutCard` always sends an empty history array to `/api/plan` — there's no `lib/storage/history.ts` yet (that's Phase 6), so Gemini always takes the "first-ever session" branch in `buildPlanPrompt.ts`. Revisit once Phase 6 adds real persisted `SessionRecord`s.

**Also done, pulled forward from Phase 7 (user asked to deploy early):**
- ✅ `render.yaml` — Render Blueprint (Node runtime, `npm install && npm run build` / `npm start`)
- ✅ `lib/ai/geminiClient.ts` reads the credentials path from `GOOGLE_APPLICATION_CREDENTIALS` (falling back to `./secrets.json` for local dev) so it works with Render's Secret Files feature, which mounts at a fixed `/etc/secrets/<filename>` path, not the repo root
- ✅ `DEPLOY.md` — step-by-step Render deployment guide, including the Secret File upload (can't be done from this session — needs the user's Render dashboard) and a note on what GCP-side setup (Vertex AI API enabled, IAM role) can't be verified from here

**Manually verify before moving on:** run `npm run dev`, complete a set on any exercise, click "End session", and confirm the modal shows an actual AI-generated summary (not the fallback) — same for the landing page's "Suggested for today" card. If either shows fallback text, check the terminal for the `console.error` from the route handler (likely a GCP-side auth/permissions issue, not a code issue — see `DEPLOY.md` §4). Not yet done in this session — no browser, and no way to make a live network call to Vertex AI from here to confirm the credential actually works end-to-end.

## Phase 6 — UI Polish + History ⬜

- ⬜ `lib/storage/history.ts` — localStorage/IndexedDB read-write, `SessionRecord`
- ⬜ `app/history/page.tsx` — past sessions, stats, charts (`recharts`)
- ⬜ Once history exists: update `SuggestedWorkoutCard.tsx` to read real history and pass it to `/api/plan` instead of always sending `[]` (Phase 5 note above); `SessionSummaryModal`'s `aiSummary` should also get persisted onto its `SessionRecord`
- ⬜ Revisit shadcn/ui decision from Phase 1 if needed

## Phase 7 — Optimization + Testing + Deploy ✅ deploy pulled into Phase 5 (2026-09-14), rest ⬜

- ⬜ Performance pass (downscale model input, confirm GPU delegate + CPU fallback) — downscale already done in the post-Phase-3 smoothness pass; GPU/CPU fallback already implemented in Phase 2, not yet stress-tested on a device that actually lacks WebGL
- ⬜ Cross-device / cross-lighting testing per plan §11
- ✅ Render deploy (`render.yaml`, `DEPLOY.md`) — done ahead of schedule at the user's request; Vercel was `plan.md`'s original target but Render is what was asked for

## Phase 8 (optional) — Accounts & Sync ⬜

- ⬜ Supabase auth + cross-device history sync
