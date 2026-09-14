export function RepCounter({ count }: { count: number }) {
  return (
    <div className="absolute left-4 top-4 rounded-xl bg-black/55 px-4 py-2 text-white ring-1 ring-white/10 backdrop-blur-md">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
        Reps
      </span>
      <div className="text-3xl font-bold leading-none tabular-nums">{count}</div>
    </div>
  );
}
