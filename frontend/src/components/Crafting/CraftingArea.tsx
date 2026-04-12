import { forwardRef, type DragEvent, type PointerEvent } from "react";

import { ITEM_H, ITEM_W } from "./craftingGeometry";
import type { PlacedWithPos } from "./types";

type CraftingAreaProps = {
  items: PlacedWithPos[];
  crafting: boolean;
  clearing: boolean;
  onClear: () => void | Promise<void>;
  onCanvasDragOver: (e: DragEvent) => void;
  onCanvasDrop: (e: DragEvent) => void;
  onItemPointerDown: (e: PointerEvent<HTMLDivElement>, id: string) => void;
  onItemPointerMove: (e: PointerEvent<HTMLDivElement>, id: string) => void;
  onItemPointerUp: (e: PointerEvent<HTMLDivElement>, id: string) => void;
};

export const CraftingArea = forwardRef<HTMLDivElement, CraftingAreaProps>(
  function CraftingArea(
    {
      items,
      crafting,
      clearing,
      onClear,
      onCanvasDragOver,
      onCanvasDrop,
      onItemPointerDown,
      onItemPointerMove,
      onItemPointerUp,
    },
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
          {items.map((item) => (
            <div
              key={item.id}
              role="presentation"
              title={item.description}
              onPointerDown={(e) => onItemPointerDown(e, item.id)}
              onPointerMove={(e) => onItemPointerMove(e, item.id)}
              onPointerUp={(e) => void onItemPointerUp(e, item.id)}
              onPointerCancel={(e) => void onItemPointerUp(e, item.id)}
              style={{
                position: "absolute",
                left: item.x,
                top: item.y,
                width: ITEM_W,
                minHeight: ITEM_H,
              }}
              className={`flex cursor-grab flex-col items-center justify-center gap-0.5 rounded-lg border border-zinc-600 bg-zinc-900/90 px-1 py-1 text-center shadow-md select-none active:cursor-grabbing ${
                crafting ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <span className="text-2xl leading-none">{item.emoji}</span>
              <span className="line-clamp-2 w-full text-[9px] leading-tight text-zinc-300">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
