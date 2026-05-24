import { forwardRef, useState, type DragEvent } from "react";

import { ITEM_H, ITEM_W } from "./craftingGeometry";
import type { PlacedWithPos } from "./types";
import { useGame } from "../../game/gameContext";
import { previewDefenderStats } from "../../game/defenderStats";

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

const DEFENDER_TYPE_NAME: Record<string, string> = {
  alive_melee: "Melee",
  alive_range: "Ranged",
  spell:       "Spell",
  obstacle:    "Wall",
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

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export const CraftingArea = forwardRef<HTMLDivElement, CraftingAreaProps>(
  function CraftingArea(
    { items, crafting, clearing, onClear, onCanvasDragOver, onCanvasDrop, onItemDrop },
    ref
  ) {
    const { gameState } = useGame();
    const upgrades = gameState.upgrades;
    const mana = gameState.mana;
    const [hoveredId, setHoveredId] = useState<string | null>(null);

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

            const preview = item.defender_type
              ? previewDefenderStats(
                  { defender_type: item.defender_type, stats: item.stats },
                  upgrades
                )
              : null;

            const affordable = preview ? mana >= preview.manaCost : true;
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                role="presentation"
                draggable={!crafting}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((id) => (id === item.id ? null : id))}
                onDragStart={(e) => {
                  // Identify this crafting item for within-canvas moves/combines
                  e.dataTransfer.setData("application/crafting-item", item.id);
                  // Also carry arena payload so the arena can deploy it
                  e.dataTransfer.setData("application/defender-json", arenaPayload);
                  e.dataTransfer.effectAllowed = "move";
                  setHoveredId(null);
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
                  zIndex: isHovered ? 20 : undefined,
                }}
                className={`flex cursor-grab flex-col items-center justify-center gap-0.5 rounded-lg border bg-zinc-900/90 px-1 py-1 text-center shadow-md select-none active:cursor-grabbing ${typeColor} ${
                  crafting ? "pointer-events-none opacity-60" : ""
                } ${preview && !affordable ? "opacity-70" : ""}`}
              >
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="line-clamp-2 w-full text-[9px] leading-tight text-zinc-300">
                  {item.name}
                </span>
                {typeLabel && (
                  <span className="text-[8px] text-zinc-500/80">{typeLabel}</span>
                )}
                {preview && (
                  <span
                    className={`text-[8px] font-semibold ${
                      affordable ? "text-sky-300" : "text-red-400"
                    }`}
                  >
                    ⚡{preview.manaCost}
                  </span>
                )}

                {/* Stat preview tooltip */}
                {isHovered && preview && (
                  <div
                    className="pointer-events-none absolute left-full top-0 z-30 ml-2 w-[180px] rounded-md border border-zinc-600 bg-zinc-950/95 p-2 text-left text-[10px] text-zinc-200 shadow-xl"
                    style={{ whiteSpace: "normal" }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 border-b border-zinc-800 pb-1">
                      <span className="font-semibold text-amber-200">
                        {item.name}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide text-zinc-400">
                        {DEFENDER_TYPE_NAME[preview.type]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mb-1.5 line-clamp-3 text-[9px] italic text-zinc-400">
                        {item.description}
                      </p>
                    )}
                    <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <dt className="text-zinc-500">HP</dt>
                      <dd className="text-right">{fmt(preview.hp)}</dd>
                      <dt className="text-zinc-500">Damage</dt>
                      <dd className="text-right">{fmt(preview.damage)}</dd>
                      {preview.type !== "spell" && (
                        <>
                          <dt className="text-zinc-500">Range</dt>
                          <dd className="text-right">{fmt(preview.range)}</dd>
                        </>
                      )}
                      {preview.type === "spell" || preview.type === "obstacle" ? (
                        <>
                          <dt className="text-zinc-500">Area</dt>
                          <dd className="text-right">
                            {preview.type === "spell"
                              ? fmt(preview.area)
                              : fmt(preview.range)}
                          </dd>
                        </>
                      ) : null}
                      <dt className="text-zinc-500">Lifetime</dt>
                      <dd className="text-right">{fmt(preview.lifetime)}s</dd>
                      {preview.type === "alive_melee" && (
                        <>
                          <dt className="text-zinc-500">Speed</dt>
                          <dd className="text-right">{fmt(preview.moveSpeed)}</dd>
                        </>
                      )}
                      <dt
                        className={
                          affordable ? "text-sky-400" : "text-red-400"
                        }
                      >
                        Mana cost
                      </dt>
                      <dd
                        className={`text-right ${
                          affordable ? "text-sky-300" : "text-red-400"
                        }`}
                      >
                        ⚡{preview.manaCost}
                      </dd>
                    </dl>
                    <p className="mt-1.5 border-t border-zinc-800 pt-1 text-[9px] text-zinc-500">
                      Drag onto another item to combine · drag to Arena to deploy
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[9px] text-zinc-600">
          Drag items together to combine · Drag to Arena panel to deploy · ⚡ = mana cost
        </p>
      </div>
    );
  }
);
