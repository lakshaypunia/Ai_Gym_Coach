export function AngleReadout({ label, angleDeg }: { label: string; angleDeg: number }) {
  return (
    <div className="absolute right-4 top-4 rounded-lg bg-black/60 px-3 py-2 text-right text-white backdrop-blur">
      <span className="text-xs uppercase tracking-wide text-zinc-300">{label}</span>
      <div className="text-2xl font-bold leading-none">{Math.round(angleDeg)}°</div>
    </div>
  );
}
