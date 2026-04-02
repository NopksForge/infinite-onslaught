import { ElementSlot } from "./ElementSlot";

export function CombineBox() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
        Craft Table
      </div>

      <div className="flex items-center justify-center gap-3">
        <ElementSlot label="Slot 1" emoji="?" />
        <span className="text-lg font-semibold text-zinc-400">+</span>
        <ElementSlot label="Slot 2" emoji="?" />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-amber-400/60 bg-amber-500/90 px-3 py-1 text-xs font-semibold text-zinc-950 shadow-sm hover:bg-amber-400"
        >
          Combine
        </button>
        <span className="text-[11px] text-zinc-400">
          Drag items here to discover new combos.
        </span>
      </div>
    </div>
  );
}

