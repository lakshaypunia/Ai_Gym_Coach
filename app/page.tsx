import Link from "next/link";
import { SuggestedWorkoutCard } from "@/components/summary/SuggestedWorkoutCard";

const FEATURES = [
  {
    icon: "🎯",
    title: "Live rep counting",
    description: "A per-exercise state machine tracks joint angles and counts reps as you move.",
  },
  {
    icon: "🗣️",
    title: "Spoken form cues",
    description: "Hear a correction the moment your form breaks — no need to glance at a screen.",
  },
  {
    icon: "🔒",
    title: "100% on-device vision",
    description: "Your camera feed and pose data never leave your browser.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6">
      <main className="flex w-full max-w-3xl flex-col items-center gap-10 py-20 text-center sm:py-28">
        <div className="flex flex-col items-center gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Powered by MediaPipe pose tracking + Gemini
          </span>

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Your form,{" "}
            <span className="bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">
              corrected live
            </span>
          </h1>

          <p className="max-w-md text-balance text-lg leading-8 text-muted">
            Real-time pose-based posture correction and rep counting, right in your browser — no
            app, no upload, no account.
          </p>
        </div>

        <Link
          href="/workout"
          className="group flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-medium text-accent-foreground shadow-lg shadow-accent/25 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Start a workout
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>

        <div className="grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
            </div>
          ))}
        </div>

        <SuggestedWorkoutCard />
      </main>
    </div>
  );
}
