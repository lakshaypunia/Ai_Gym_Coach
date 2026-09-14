# Deploying to Render

This deploys everything through Phase 5: camera capture, live pose tracking,
rep counting, form feedback, voice cues, and the Gemini-powered post-workout
summary / suggested-workout card. `secrets.json` is never committed to git
(see `.gitignore`), so it needs to be uploaded to Render separately as a
**Secret File**, not baked into the deploy.

I can't do this part myself — deploying requires clicking through Render's
own dashboard with your account. Steps:

## 1. Push this repo to GitHub (if you haven't already)

```
git remote add origin <your-repo-url>   # if not already set
git push -u origin main
```

## 2. Create the Render service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect the GitHub repo (`ai_gym_coach`).
3. Render should auto-detect `render.yaml` in the repo root and pre-fill the
   settings below — confirm they match, or set them manually if it doesn't
   pick it up:
   - **Runtime**: Node
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm start`
   - **Plan**: Free (fine for testing; the free tier spins down after 15 min
     idle and takes ~30-60s to wake back up on the next request — expect a
     slow first load after idling)

## 3. Add the service account key as a Secret File

`render.yaml` sets `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/secrets.json`
already — Render's Secret Files always mount at `/etc/secrets/<filename>`,
so the filename you give it here must be exactly `secrets.json`.

1. On the service page → **Environment** tab → **Secret Files** → **Add Secret File**.
2. Filename: `secrets.json`
3. Contents: paste the full contents of your local `secrets.json` (the GCP
   service account key — `type`, `project_id`, `private_key`, `client_email`,
   etc.).
4. Save. Render redeploys automatically when a secret file changes.

## 4. Confirm the GCP side is actually set up

The service account in `secrets.json` needs, on its GCP project:
- The **Vertex AI API** enabled.
- The `roles/aiplatform.user` IAM role (or broader) granted to that service
  account.

I can't verify this from here — if `/api/feedback` or `/api/plan` come back
using the fallback text (see `steps.md` Phase 5) instead of an AI-generated
one, this is the first thing to check (check the Render service's Logs tab
for the actual error `console.error`'d from the route handlers).

## 5. Verify

Once deployed, open the Render URL and check:
- `/` loads and the "Suggested for today" card shows text (AI-generated or
  fallback — both count as "working"; check Logs to tell which).
- `/workout/bicep_curl` (or squat/pushup) prompts for camera access, tracks
  a live skeleton, counts reps, and speaks cues.
- Clicking **End session** after a few reps shows the summary modal with
  either an AI summary or the fallback text.

## What's not deployed yet

Everything through Phase 5 is live. Phase 6 (session history/localStorage,
`/history` page) and Phase 7 (further perf/testing polish) aren't built yet
— `steps.md` tracks what's left. No redeploy steps change for those; Render
auto-deploys on every push to `main` once connected.
