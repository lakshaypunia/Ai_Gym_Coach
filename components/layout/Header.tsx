import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"
          >
            💪
          </span>
          AI Gym Coach
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/workout"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            Workouts
          </Link>
        </nav>
      </div>
    </header>
  );
}
