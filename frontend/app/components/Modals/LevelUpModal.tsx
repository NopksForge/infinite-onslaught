type LevelUpModalProps = {
  open?: boolean;
};

export function LevelUpModal({ open = false }: LevelUpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-amber-400/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-amber-200">
          Level Up!
        </h2>
        <p className="mb-3 text-xs text-zinc-300">
          Choose one upgrade to empower your defenders.
        </p>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          {["Swift Blades", "Rapid Fire", "Reinforced Walls"].map((name) => (
            <button
              key={name}
              type="button"
              className="flex flex-col rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-2 text-left hover:border-amber-400/70"
            >
              <span className="text-[11px] font-semibold text-zinc-50">
                {name}
              </span>
              <span className="mt-1 text-[10px] text-zinc-400">
                Placeholder upgrade description.
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

