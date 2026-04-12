type NewElementModalProps = {
  open?: boolean;
};

export function NewElementModal({ open = false }: NewElementModalProps) {
  if (!open) return null;

  const options = [
    { id: "ice", name: "Ice", emoji: "🧊" },
    { id: "thunder", name: "Thunder", emoji: "⚡" },
    { id: "sand", name: "Sand", emoji: "🏜️" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-sky-400/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-sky-200">
          New Element Unlocked
        </h2>
        <p className="mb-3 text-xs text-zinc-300">
          Choose one new element to add to your pool.
        </p>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="flex flex-col items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-3 text-center hover:border-sky-400/70"
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[11px] font-semibold text-zinc-50">
                {opt.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
