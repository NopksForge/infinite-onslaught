const MOCK_RESOURCES = [
  { id: "fire", label: "Fire", emoji: "🔥", count: 5 },
  { id: "water", label: "Water", emoji: "💧", count: 5 },
  { id: "air", label: "Air", emoji: "🌪️", count: 5 },
  { id: "dirt", label: "Dirt", emoji: "🪨", count: 5 },
];

export function ResourceBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs">
      <span className="mr-1 font-semibold uppercase tracking-wide text-amber-300">
        Resources
      </span>
      {MOCK_RESOURCES.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-1"
        >
          <span className="text-base leading-none">{r.emoji}</span>
          <span className="text-[11px] text-zinc-100">×{r.count}</span>
        </div>
      ))}
    </div>
  );
}

