import { useGame } from "../../game/gameContext";

export function HUD() {
  const { gameState, xpProgress } = useGame();
  const { level, xp, baseHp, maxBaseHp } = gameState;
  const { current: xpCurrent, needed: xpNeeded } = xpProgress;
  const xpPct = xpNeeded > 0 ? (xpCurrent / xpNeeded) * 100 : 0;
  const hpPct = maxBaseHp > 0 ? (baseHp / maxBaseHp) * 100 : 0;

  return (
    <header className="flex items-center justify-between gap-4 rounded-lg border border-amber-400/60 bg-zinc-900/70 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Level
        </span>
        <span className="rounded bg-zinc-800 px-2 py-1 text-xs">{level}</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          XP
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-amber-400 to-orange-500 transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-400">
          {xpCurrent} / {xpNeeded}
        </span>
        <span className="text-[10px] text-zinc-500">(total {xp})</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Base HP
        </span>
        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`absolute inset-y-0 left-0 transition-all ${
              hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-amber-400" : "bg-red-500"
            }`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <span className="rounded bg-zinc-800 px-2 py-1 text-xs">
          {Math.ceil(baseHp)} / {maxBaseHp}
        </span>
      </div>
    </header>
  );
}
