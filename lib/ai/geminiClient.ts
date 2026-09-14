import "server-only";
import fs from "node:fs";
import path from "node:path";
import { VertexAI, type GenerateContentResult, type GenerativeModel } from "@google-cloud/vertexai";

interface ServiceAccountCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
}

// GOOGLE_APPLICATION_CREDENTIALS (the standard GCP env var name) lets a
// deploy target point at wherever it mounts the key — e.g. Render's "Secret
// Files" feature mounts uploaded files at /etc/secrets/<filename>, which
// isn't the repo root. Falls back to ./secrets.json for local dev.
const CREDENTIALS_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? path.join(process.cwd(), "secrets.json");
const MODEL_NAME = "gemini-2.5-flash";

let cachedModel: GenerativeModel | null = null;

function loadCredentials(): ServiceAccountCredentials {
  // The path is env-derived (deployment-specific, see the const above), so
  // Turbopack can't statically resolve it and would otherwise conservatively
  // trace/bundle the whole project as server output. This is a plain runtime
  // file read, not something that needs tracing.
  const raw = fs.readFileSync(/* turbopackIgnore: true */ CREDENTIALS_PATH, "utf-8");
  return JSON.parse(raw) as ServiceAccountCredentials;
}

/**
 * Lazily creates and caches a Vertex AI GenerativeModel client, authenticated
 * via the GCP service account key in secrets.json (project root, gitignored,
 * never committed). This is Vertex AI rather than the plain Gemini Developer
 * API `plan.md` §9 originally assumed, because a service-account key is
 * Vertex's auth mechanism, not a simple API-key string — see
 * TECHNICAL_DETAILS.md for the full explanation. Server-side only: this
 * module reads a local file via `node:fs`, so it can only ever be imported
 * from a Route Handler, never a `"use client"` component.
 */
export function getGeminiModel(): GenerativeModel {
  if (!cachedModel) {
    const credentials = loadCredentials();
    const vertexAI = new VertexAI({
      project: credentials.project_id,
      location: process.env.GEMINI_LOCATION ?? "us-central1",
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      },
    });
    cachedModel = vertexAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return cachedModel;
}

/**
 * Pulls the plain text out of a Vertex AI generateContent result. Unlike the
 * `@google/generative-ai` SDK `plan.md` originally assumed, this SDK has no
 * `.text()` convenience method — the text lives at
 * `response.candidates[0].content.parts[*].text`.
 */
export function extractResponseText(result: GenerateContentResult): string {
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}
