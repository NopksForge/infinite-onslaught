import { useGame } from "../../game/gameContext";

export function LevelUpModal() {
  const { activeModal, pendingUpgradeChoices, applyUpgrade, gameState } =
    useGame();

  if (activeModal !== "level_up") return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-amber-400/70 bg-zinc-950 p-4 shadow-xl">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-amber-200">
            Level {gameState.level} — Choose an upgrade
          </h2>
        </div>
        <p className="mb-3 text-xs text-zinc-300">
          Empower your defenders for the rest of this run.
        </p>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          {pendingUpgradeChoices.map((upgrade) => (
            <button
              key={upgrade.id}
              type="button"
              onClick={() => applyUpgrade(upgrade.id)}
              className="flex flex-col gap-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-3 text-left transition hover:border-amber-400/70 hover:bg-zinc-900"
            >
              <span className="text-xl leading-none">{upgrade.emoji}</span>
              <span className="text-[11px] font-semibold text-zinc-50">
                {upgrade.name}
              </span>
              <span className="text-[10px] text-zinc-400">
                {upgrade.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
