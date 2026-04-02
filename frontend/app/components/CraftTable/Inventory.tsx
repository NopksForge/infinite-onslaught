import { InventoryItem } from "./InventoryItem";

const MOCK_INVENTORY = [
  { id: "fire", name: "Fire", emoji: "🔥", rarity: "common" as const },
  { id: "water", name: "Water", emoji: "💧", rarity: "common" as const },
  { id: "steam", name: "Steam", emoji: "♨️", rarity: "uncommon" as const },
  { id: "lava", name: "Lava", emoji: "🌋", rarity: "uncommon" as const },
];

export function Inventory() {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <div className="font-semibold uppercase tracking-wide text-amber-300">
          Inventory
        </div>
        <div className="text-[10px] text-zinc-500">Discovered items</div>
      </div>

      <div className="custom-scrollbar grid flex-1 grid-cols-3 gap-2 overflow-y-auto pr-1">
        {MOCK_INVENTORY.map((item) => (
          <InventoryItem
            key={item.id}
            name={item.name}
            emoji={item.emoji}
            rarity={item.rarity}
          />
        ))}
      </div>
    </div>
  );
}

