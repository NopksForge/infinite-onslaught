export function HUD() {
  return (
    <header className="flex items-center justify-between gap-4 rounded-lg border border-amber-400/60 bg-zinc-900/70 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Level
        </span>
        <span className="rounded bg-zinc-800 px-2 py-1 text-xs">1</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          XP
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-amber-400 to-orange-500" />
        </div>
        <span className="text-[10px] text-zinc-400">25 / 100</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Base HP
        </span>
        <span className="rounded bg-zinc-800 px-2 py-1 text-xs">100 / 100</span>
      </div>
    </header>
  );
}
