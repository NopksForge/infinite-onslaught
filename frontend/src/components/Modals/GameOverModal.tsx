import { useGame } from "../../game/gameContext";

export function GameOverModal() {
  const { gameState, resetGame, exitToMenu } = useGame();

  if (gameState.status !== "game_over") return null;

  const { wave, xp } = gameState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm rounded-xl border border-red-500/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-red-300">Game Over</h2>
        <p className="mb-3 text-xs text-zinc-300">
          You held the line for{" "}
          <span className="font-semibold">
            {wave} wave{wave === 1 ? "" : "s"}
          </span>
          .
        </p>
        <div className="mb-3 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Total XP</span>
          <span className="text-sm font-semibold text-zinc-50">
            {xp.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={exitToMenu}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200 hover:bg-zinc-800"
          >
            Back to menu
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-md border border-amber-400/70 bg-amber-500/90 px-3 py-1 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Restart run
          </button>
        </div>
      </div>
    </div>
  );
}
