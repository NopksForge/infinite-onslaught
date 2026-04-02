type GameOverModalProps = {
  open?: boolean;
};

export function GameOverModal({ open = false }: GameOverModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-xl border border-red-500/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-red-300">
          Game Over
        </h2>
        <p className="mb-3 text-xs text-zinc-300">
          You held the line for <span className="font-semibold">7 waves</span>.
        </p>
        <div className="mb-3 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Final score</span>
          <span className="text-sm font-semibold text-zinc-50">2,840</span>
        </div>
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-200 hover:bg-zinc-800"
          >
            Back to menu
          </button>
          <button
            type="button"
            className="rounded-md border border-amber-400/70 bg-amber-500/90 px-3 py-1 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Restart run
          </button>
        </div>
      </div>
    </div>
  );
}

