import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

import { CraftingArea } from "./CraftingArea";
import { deleteCraft, getResources, postCraft } from "./craftApi";
import { useGame } from "../../game/gameContext";
import { DiscoveryPanel } from "./DiscoveryPanel";
import {
  DISCOVERY_KEY,
  clearDiscoveriesStorage,
  loadDiscoveries,
  saveDiscoveries,
} from "./discoveryStorage";
import { ITEM_H, ITEM_W, boundsFor, clamp } from "./craftingGeometry";
import { ResourcePanel } from "./ResourcePanel";
import type {
  DiscoveryItem,
  PlacedItem,
  PlacedItemDraft,
  PlacedWithPos,
  ResourceItem,
} from "./types";

const SESSION_KEY = DISCOVERY_KEY;

export function CraftingPanel() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<PlacedWithPos[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [items, setItems] = useState<PlacedWithPos[]>([]);
  const [crafting, setCrafting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resourceTick, setResourceTick] = useState(0);
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>(() =>
    loadDiscoveries(SESSION_KEY)
  );
  const combineLockRef = useRef(false);
  const { lastDeployedId, resourcesRevision } = useGame();

  itemsRef.current = items;

  // Remove item from crafting table when deployed to the arena.
  useEffect(() => {
    if (!lastDeployedId) return;
    setItems((prev) => prev.filter((i) => i.id !== lastDeployedId));
  }, [lastDeployedId]);

  // Load resources on mount / after clear / after an element is unlocked.
  useEffect(() => {
    let cancelled = false;
    setResourcesLoading(true);
    setResourcesError(null);
    void (async () => {
      try {
        const result = await getResources();
        if (cancelled) return;
        if (result.ok) setResources(result.items);
        else { setResources([]); setResourcesError(result.message); }
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resourceTick, resourcesRevision]);

  const handleClearCraft = useCallback(async () => {
    if (clearing) return;
    setClearing(true);
    try {
      const ok = await deleteCraft();
      if (ok) {
        setItems([]);
        clearDiscoveriesStorage(SESSION_KEY);
        setDiscoveries([]);
        setResourceTick((t) => t + 1);
      }
    } finally {
      setClearing(false);
    }
  }, [clearing]);

  const addAt = useCallback((item: PlacedItemDraft, x: number, y: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = boundsFor(el);
    setItems((prev) => [
      ...prev,
      {
        ...item,
        id: crypto.randomUUID(),
        x: clamp(x, 0, Math.max(0, width - ITEM_W)),
        y: clamp(y, 0, Math.max(0, height - ITEM_H)),
      },
    ]);
  }, []);

  const placeRandomInMiddle = useCallback(
    (item: PlacedItemDraft) => {
      const el = canvasRef.current;
      if (!el) return;
      const { width, height } = boundsFor(el);
      const innerW = Math.max(0, width - ITEM_W);
      const innerH = Math.max(0, height - ITEM_H);
      const inset = 0.25;
      const x = innerW * inset + Math.random() * Math.max(0, innerW * (1 - 2 * inset));
      const y = innerH * inset + Math.random() * Math.max(0, innerH * (1 - 2 * inset));
      addAt(item, x, y);
    },
    [addAt]
  );

  // ── Combine logic ───────────────────────────────────────────────────────────

  const tryCombine = useCallback(async (a: PlacedWithPos, b: PlacedWithPos) => {
    if (combineLockRef.current) return false;
    combineLockRef.current = true;
    setCrafting(true);
    try {
      const data = await postCraft(a.name, b.name);
      if (!data) return false;

      const created: PlacedItem = {
        id: crypto.randomUUID(),
        name: data.name,
        emoji: data.emoji,
        description: data.description,
        defender_type: data.defender_type,
        stats: data.stats,
      };

      setItems((prev) => {
        const next = prev.filter((p) => p.id !== a.id && p.id !== b.id);
        const el = canvasRef.current;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        if (el) {
          const { width, height } = boundsFor(el);
          next.push({
            ...created,
            x: clamp(midX, 0, Math.max(0, width - ITEM_W)),
            y: clamp(midY, 0, Math.max(0, height - ITEM_H)),
          });
        } else {
          next.push({ ...created, x: midX, y: midY });
        }
        return next;
      });

      setDiscoveries((prev) => {
        const createdFrom = data.created_from ?? [];
        if (data.is_new_item) {
          const next = [
            ...prev.filter((d) => d.name !== data.name),
            { name: data.name, description: data.description, emoji: data.emoji, created_from: createdFrom },
          ];
          saveDiscoveries(SESSION_KEY, next);
          return next;
        }
        if (data.is_new_combination && !data.is_new_item) {
          const idx = prev.findIndex((d) => d.name === data.name);
          if (idx === -1) {
            const next = [...prev, { name: data.name, description: data.description, emoji: data.emoji, created_from: createdFrom }];
            saveDiscoveries(SESSION_KEY, next);
            return next;
          }
          const next = prev.map((d, i) => i === idx ? { ...d, created_from: createdFrom } : d);
          saveDiscoveries(SESSION_KEY, next);
          return next;
        }
        return prev;
      });

      return true;
    } finally {
      combineLockRef.current = false;
      setCrafting(false);
    }
  }, []);

  /** Called when item A is dropped ON item B inside the crafting canvas. */
  const onItemDrop = useCallback(
    async (droppedId: string, targetId: string) => {
      const a = itemsRef.current.find((i) => i.id === droppedId);
      const b = itemsRef.current.find((i) => i.id === targetId);
      if (!a || !b) return;
      await tryCombine(a, b);
    },
    [tryCombine]
  );

  // ── Canvas DnD handlers ─────────────────────────────────────────────────────

  const onCanvasDragOver = (e: DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes("application/crafting-item") || types.includes("application/json")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const onCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Item moved within the crafting canvas (dropped on empty space, not on another item).
    const craftingItemId = e.dataTransfer.getData("application/crafting-item");
    if (craftingItemId) {
      const x = clamp(e.clientX - rect.left - ITEM_W / 2, 0, Math.max(0, el.clientWidth - ITEM_W));
      const y = clamp(e.clientY - rect.top - ITEM_H / 2, 0, Math.max(0, el.clientHeight - ITEM_H));
      setItems((prev) =>
        prev.map((p) => (p.id === craftingItemId ? { ...p, x, y } : p))
      );
      return;
    }

    // Resource dropped from the resource panel.
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let parsed: { name?: string; emoji?: string; description?: unknown };
    try { parsed = JSON.parse(raw) as typeof parsed; } catch { return; }
    if (!parsed.name || !parsed.emoji) return;

    const draft: PlacedItemDraft = {
      name: parsed.name,
      emoji: parsed.emoji,
      description: typeof parsed.description === "string" ? parsed.description : "",
      defender_type: (parsed as PlacedItemDraft).defender_type,
      stats: (parsed as PlacedItemDraft).stats,
    };
    addAt(draft, e.clientX - rect.left - ITEM_W / 2, e.clientY - rect.top - ITEM_H / 2);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 text-xs">
      <ResourcePanel
        resources={resources}
        loading={resourcesLoading}
        error={resourcesError}
        onPlaceResource={placeRandomInMiddle}
      />
      <CraftingArea
        ref={canvasRef}
        items={items}
        crafting={crafting}
        clearing={clearing}
        onClear={handleClearCraft}
        onCanvasDragOver={onCanvasDragOver}
        onCanvasDrop={onCanvasDrop}
        onItemDrop={onItemDrop}
      />
      <DiscoveryPanel discoveries={discoveries} />
    </section>
  );
}
