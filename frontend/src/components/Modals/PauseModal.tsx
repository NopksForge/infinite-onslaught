import { useGame } from "../../game/gameContext";

export function PauseModal() {
  const { gameState, resumeGame, resetGame, exitToMenu } = useGame();

  if (gameState.status !== "paused") return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-xs rounded-xl border border-amber-400/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-amber-200">Paused</h2>
        <p className="mb-3 text-[11px] text-zinc-400">
          Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">Esc</kbd>{" "}
          to resume.
        </p>
        <div className="flex flex-col gap-2 text-xs">
          <button
            type="button"
            onClick={resumeGame}
            className="rounded-md border border-amber-400/70 bg-amber-500/90 px-3 py-1.5 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            Restart run
          </button>
          <button
            type="button"
            onClick={exitToMenu}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
