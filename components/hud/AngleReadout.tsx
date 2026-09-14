export function AngleReadout({ label, angleDeg }: { label: string; angleDeg: number }) {
  return (
    <div className="absolute right-4 top-4 rounded-xl bg-black/55 px-4 py-2 text-right text-white ring-1 ring-white/10 backdrop-blur-md">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
        {label}
      </span>
      <div className="text-3xl font-bold leading-none tabular-nums">{Math.round(angleDeg)}°</div>
    </div>
  );
}
