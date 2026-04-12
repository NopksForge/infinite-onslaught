import { forwardRef, type DragEvent } from "react";

import { ITEM_H, ITEM_W } from "./craftingGeometry";
import type { PlacedWithPos } from "./types";

const DEFENDER_TYPE_COLORS: Record<string, string> = {
  alive_melee: "border-amber-400/70",
  alive_range: "border-blue-400/70",
  spell:       "border-purple-400/70",
  obstacle:    "border-green-400/70",
};

const DEFENDER_TYPE_LABEL: Record<string, string> = {
  alive_melee: "⚔ melee",
  alive_range: "🏹 range",
  spell:       "✦ spell",
  obstacle:    "🛡 wall",
};

type CraftingAreaProps = {
  items: PlacedWithPos[];
  crafting: boolean;
  clearing: boolean;
  onClear: () => void | Promise<void>;
  onCanvasDragOver: (e: DragEvent) => void;
  onCanvasDrop: (e: DragEvent) => void;
  /** Called when one item is dropped onto another to combine them. */
  onItemDrop: (droppedId: string, targetId: string) => void;
};

export const CraftingArea = forwardRef<HTMLDivElement, CraftingAreaProps>(
  function CraftingArea(
    { items, crafting, clearing, onClear, onCanvasDragOver, onCanvasDrop, onItemDrop },
    ref
  ) {
    return (
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold uppercase tracking-wide text-amber-300">
            Crafting area
          </span>
          <div className="flex items-center gap-2">
            {crafting && (
              <span className="text-[10px] text-amber-200/80">Combining…</span>
            )}
            <button
              type="button"
              onClick={() => void onClear()}
              disabled={clearing || crafting}
              className="rounded-md border border-zinc-600 bg-zinc-800/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 transition hover:border-amber-400/50 hover:bg-zinc-700/80 disabled:pointer-events-none disabled:opacity-40"
            >
              {clearing ? "Clearing…" : "Clear"}
            </button>
          </div>
        </div>

        <div
          ref={ref}
          onDragOver={onCanvasDragOver}
          onDrop={onCanvasDrop}
          className="relative min-h-[280px] flex-1 overflow-hidden rounded-md border border-dashed border-zinc-700 bg-zinc-900/40"
        >
          {items.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-zinc-600">
              Drop or click resources to start crafting
            </div>
          )}

          {items.map((item) => {
            const typeColor = item.defender_type
              ? (DEFENDER_TYPE_COLORS[item.defender_type] ?? "border-zinc-600")
              : "border-zinc-600";
            const typeLabel = item.defender_type
              ? (DEFENDER_TYPE_LABEL[item.defender_type] ?? "")
              : "";

            // Payload for arena drop
            const arenaPayload = JSON.stringify({
              name: item.name,
              emoji: item.emoji,
              description: item.description,
              defender_type: item.defender_type,
              stats: item.stats,
              craftingId: item.id,
            });

            return (
              <div
                key={item.id}
                role="presentation"
                title={`${item.name}${item.defender_type ? ` — ${item.defender_type}` : ""}\n${item.description}\n\nDrag onto another item to combine, or drag to the Arena to deploy.`}
                draggable={!crafting}
                onDragStart={(e) => {
                  // Identify this crafting item for within-canvas moves/combines
                  e.dataTransfer.setData("application/crafting-item", item.id);
                  // Also carry arena payload so the arena can deploy it
                  e.dataTransfer.setData("application/defender-json", arenaPayload);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  // Accept drops from other crafting items (for combining)
                  if (e.dataTransfer.types.includes("application/crafting-item")) {
                    e.preventDefault();
                    e.stopPropagation(); // don't let canvas handle this as a move
                    e.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // prevent canvas onDrop from also firing
                  const droppedId = e.dataTransfer.getData("application/crafting-item");
                  if (droppedId && droppedId !== item.id) {
                    onItemDrop(droppedId, item.id);
                  }
                }}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                  width: ITEM_W,
                  minHeight: ITEM_H,
                }}
                className={`flex cursor-grab flex-col items-center justify-center gap-0.5 rounded-lg border bg-zinc-900/90 px-1 py-1 text-center shadow-md select-none active:cursor-grabbing ${typeColor} ${
                  crafting ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="line-clamp-2 w-full text-[9px] leading-tight text-zinc-300">
                  {item.name}
                </span>
                {typeLabel && (
                  <span className="text-[8px] text-zinc-500/80">{typeLabel}</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[9px] text-zinc-600">
          Drag items together to combine · Drag to Arena panel to deploy
        </p>
      </div>
    );
  }
);
