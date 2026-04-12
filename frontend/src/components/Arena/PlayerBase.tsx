export function PlayerBase() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-emerald-500/60 bg-zinc-900/80 px-3 py-1 text-[11px] text-emerald-100">
      <span className="text-base leading-none">🏰</span>
      <span className="font-semibold uppercase tracking-wide">Base</span>
      <span className="rounded bg-zinc-950/70 px-2 py-0.5 text-[10px]">
        HP 100 / 100
      </span>
    </div>
  );
}
