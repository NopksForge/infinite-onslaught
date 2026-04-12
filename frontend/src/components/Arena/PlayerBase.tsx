import { useGame } from "../../game/gameContext";

export function PlayerBase() {
  const { gameState } = useGame();
  const { baseHp, maxBaseHp } = gameState;
  const hpPct = maxBaseHp > 0 ? (baseHp / maxBaseHp) * 100 : 0;

  return (
    <div className="flex items-center gap-2 rounded-md border border-emerald-500/60 bg-zinc-900/80 px-3 py-1 text-[11px] text-emerald-100">
      <span className="text-base leading-none">🏰</span>
      <span className="font-semibold uppercase tracking-wide">Base</span>
      <div className="relative h-1.5 w-14 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            hpPct > 50 ? "bg-emerald-500" : hpPct > 25 ? "bg-amber-400" : "bg-red-500"
          }`}
          style={{ width: `${hpPct}%` }}
        />
      </div>
      <span className="rounded bg-zinc-950/70 px-2 py-0.5 text-[10px]">
        {Math.ceil(baseHp)} / {maxBaseHp}
      </span>
    </div>
  );
}
