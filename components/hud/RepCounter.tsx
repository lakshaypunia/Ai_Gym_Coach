export function RepCounter({ count }: { count: number }) {
  return (
    <div className="absolute left-4 top-4 rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur">
      <span className="text-xs uppercase tracking-wide text-zinc-300">Reps</span>
      <div className="text-3xl font-bold leading-none">{count}</div>
    </div>
  );
}
