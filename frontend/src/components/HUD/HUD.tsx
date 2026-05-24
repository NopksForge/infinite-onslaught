import { useGame } from "../../game/gameContext";

export function HUD() {
  const { gameState, xpProgress, pauseGame, resumeGame } = useGame();
  const { status, level, xp, baseHp, maxBaseHp, mana, maxMana } = gameState;
  const { current: xpCurrent, needed: xpNeeded } = xpProgress;
  const xpPct = xpNeeded > 0 ? (xpCurrent / xpNeeded) * 100 : 0;
  const hpPct = maxBaseHp > 0 ? (baseHp / maxBaseHp) * 100 : 0;
  const manaPct = maxMana > 0 ? (mana / maxMana) * 100 : 0;
  const canPause = status === "active" || status === "paused";

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
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-300">
          Mana
        </span>
        <div className="relative h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-sky-400 to-indigo-500 transition-all"
            style={{ width: `${manaPct}%` }}
          />
        </div>
        <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-sky-200">
          {Math.floor(mana)} / {maxMana}
        </span>
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

      <button
        type="button"
        onClick={status === "paused" ? resumeGame : pauseGame}
        disabled={!canPause}
        title={status === "paused" ? "Resume (Esc)" : "Pause (Esc)"}
        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "paused" ? "▶" : "❚❚"}
      </button>
    </header>
  );
}
