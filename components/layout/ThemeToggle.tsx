"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  // null until mounted — avoids guessing the theme during SSR/hydration,
  // when localStorage/matchMedia aren't available yet.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // localStorage/matchMedia don't exist during SSR — this has to run
    // client-side after mount, same reasoning as app/history/page.tsx.
    const stored = window.localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "light" || stored === "dark" ? stored : systemTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={theme === null}
      aria-label={theme ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-colors hover:bg-foreground/5 disabled:opacity-0"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
