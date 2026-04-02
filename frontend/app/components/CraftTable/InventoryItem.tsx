type InventoryItemProps = {
  name: string;
  emoji: string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
};

const rarityBorder: Record<NonNullable<InventoryItemProps["rarity"]>, string> =
  {
    common: "border-zinc-700",
    uncommon: "border-emerald-500/70",
    rare: "border-sky-500/70",
    epic: "border-violet-500/70",
    legendary: "border-amber-400/80",
  };

export function InventoryItem({ name, emoji, rarity = "common" }: InventoryItemProps) {
  return (
    <button
      type="button"
      className={`flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-md border bg-zinc-900/70 text-[11px] text-zinc-100 shadow-sm transition hover:translate-y-px hover:bg-zinc-800/80 ${
        rarityBorder[rarity]
      }`}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="line-clamp-2 px-1 text-[10px]">{name}</span>
    </button>
  );
}

