import type { DragEvent } from "react";

import type { PlacedItemDraft, ResourceItem } from "./types";

type ResourcePanelProps = {
  resources: ResourceItem[];
  loading: boolean;
  error: string | null;
  onPlaceResource: (draft: PlacedItemDraft) => void;
};

function onResourceDragStart(e: DragEvent, resource: ResourceItem) {
  const payload = {
    name: resource.name,
    emoji: resource.emoji,
    description: resource.description,
    defender_type: resource.defender_type,
    stats: resource.stats,
  };
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}

export function ResourcePanel({
  resources,
  loading,
  error,
  onPlaceResource,
}: ResourcePanelProps) {
  const disabled = loading || !!error;

  return (
    <div className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
        Resources
      </div>
      {loading && (
        <p className="text-[11px] text-zinc-500">Loading resources…</p>
      )}
      {error && <p className="text-[11px] text-red-400/90">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resources.map((r) => (
          <button
            key={r.name}
            type="button"
            draggable={!disabled}
            disabled={disabled}
            onDragStart={(e) => onResourceDragStart(e, r)}
            onClick={() =>
              onPlaceResource({
                name: r.name,
                emoji: r.emoji,
                description: r.description,
                defender_type: r.defender_type,
                stats: r.stats,
              })
            }
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-4 text-center shadow-sm transition hover:border-amber-400/50 hover:bg-zinc-800/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            title={r.description}
          >
            <span className="text-3xl leading-none select-none">{r.emoji}</span>
            <span className="text-[11px] font-medium text-zinc-100">
              {r.name}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">
        Click to place randomly in the middle of the crafting area, or drag onto
        it.
      </p>
    </div>
  );
}
