"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CraftingArea } from "./CraftingArea";
import { deleteCraft, getResources, postCraft } from "./craftApi";
import { DiscoveryPanel } from "./DiscoveryPanel";
import {
  clearDiscoveriesStorage,
  loadDiscoveries,
  saveDiscoveries,
} from "./discoveryStorage";
import {
  ITEM_H,
  ITEM_W,
  boundsFor,
  boxesOverlap,
  clamp,
} from "./craftingGeometry";
import { ResourcePanel } from "./ResourcePanel";
import type {
  DiscoveryItem,
  PlacedItem,
  PlacedItemDraft,
  PlacedWithPos,
  ResourceItem,
} from "./types";

export function CraftingPanel() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<PlacedWithPos[]>([]);
  const [referenceId, setReferenceId] = useState("");
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [items, setItems] = useState<PlacedWithPos[]>([]);
  const [crafting, setCrafting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resourceTick, setResourceTick] = useState(0);
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([]);
  const combineLockRef = useRef(false);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  itemsRef.current = items;

  useEffect(() => {
    let id = sessionStorage.getItem("craft-ref-id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("craft-ref-id", id);
    }
    setReferenceId(id);
  }, []);

  useEffect(() => {
    if (!referenceId) return;
    setDiscoveries(loadDiscoveries(referenceId));
  }, [referenceId]);

  useEffect(() => {
    if (!referenceId) return;
    let cancelled = false;
    setResourcesLoading(true);
    setResourcesError(null);
    void (async () => {
      try {
        const result = await getResources(referenceId);
        if (cancelled) return;
        if (result.ok) {
          setResources(result.items);
        } else {
          setResources([]);
          setResourcesError(result.message);
        }
      } finally {
        if (!cancelled) setResourcesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referenceId, resourceTick]);

  const handleClearCraft = useCallback(async () => {
    if (!referenceId || clearing) return;
    setClearing(true);
    try {
      const ok = await deleteCraft(referenceId);
      if (ok) {
        setItems([]);
        clearDiscoveriesStorage(referenceId);
        setDiscoveries([]);
        setResourceTick((t) => t + 1);
      }
    } finally {
      setClearing(false);
    }
  }, [referenceId, clearing]);

  const addAt = useCallback((item: PlacedItemDraft, x: number, y: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = boundsFor(el);
    const nx = clamp(x, 0, Math.max(0, width - ITEM_W));
    const ny = clamp(y, 0, Math.max(0, height - ITEM_H));
    setItems((prev) => [
      ...prev,
      { ...item, id: crypto.randomUUID(), x: nx, y: ny },
    ]);
  }, []);

  /** Random position inside the central ~50% of the crafting canvas (click from resources). */
  const placeRandomInMiddle = useCallback(
    (item: PlacedItemDraft) => {
      const el = canvasRef.current;
      if (!el) return;
      const { width, height } = boundsFor(el);
      const innerW = Math.max(0, width - ITEM_W);
      const innerH = Math.max(0, height - ITEM_H);
      const inset = 0.25;
      const x0 = innerW * inset;
      const y0 = innerH * inset;
      const spanX = Math.max(0, innerW * (1 - 2 * inset));
      const spanY = Math.max(0, innerH * (1 - 2 * inset));
      const x = x0 + (spanX > 0 ? Math.random() * spanX : 0);
      const y = y0 + (spanY > 0 ? Math.random() * spanY : 0);
      addAt(item, x, y);
    },
    [addAt]
  );

  const onCanvasDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (!el) return;
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let parsed: { name?: string; emoji?: string; description?: unknown };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return;
    }
    if (!parsed.name || !parsed.emoji) return;
    const draft: PlacedItemDraft = {
      name: parsed.name,
      emoji: parsed.emoji,
      description:
        typeof parsed.description === "string" ? parsed.description : "",
    };
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - ITEM_W / 2;
    const y = e.clientY - rect.top - ITEM_H / 2;
    addAt(draft, x, y);
  };

  const tryCombine = useCallback(
    async (a: PlacedWithPos, b: PlacedWithPos) => {
      if (!referenceId || combineLockRef.current) return false;
      combineLockRef.current = true;
      setCrafting(true);
      try {
        const data = await postCraft(referenceId, a.name, b.name);
        if (!data) {
          return false;
        }
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const created: PlacedItem = {
          id: crypto.randomUUID(),
          name: data.name,
          emoji: data.emoji,
          description: data.description,
        };
        setItems((prev) => {
          const next = prev.filter((p) => p.id !== a.id && p.id !== b.id);
          const el = canvasRef.current;
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
              {
                name: data.name,
                description: data.description,
                emoji: data.emoji,
                created_from: createdFrom,
              },
            ];
            saveDiscoveries(referenceId, next);
            return next;
          }
          if (data.is_new_combination && !data.is_new_item) {
            const idx = prev.findIndex((d) => d.name === data.name);
            if (idx === -1) {
              const next = [
                ...prev,
                {
                  name: data.name,
                  description: data.description,
                  emoji: data.emoji,
                  created_from: createdFrom,
                },
              ];
              saveDiscoveries(referenceId, next);
              return next;
            }
            const next = prev.map((d, i) =>
              i === idx ? { ...d, created_from: createdFrom } : d
            );
            saveDiscoveries(referenceId, next);
            return next;
          }
          return prev;
        });
        return true;
      } finally {
        combineLockRef.current = false;
        setCrafting(false);
      }
    },
    [referenceId]
  );

  const onItemPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || crafting) return;
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    };
  };

  const onItemPointerMove = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = boundsFor(el);
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              x: clamp(d.origX + dx, 0, Math.max(0, width - ITEM_W)),
              y: clamp(d.origY + dy, 0, Math.max(0, height - ITEM_H)),
            }
          : p
      )
    );
  };

  const onItemPointerUp = async (
    e: ReactPointerEvent<HTMLDivElement>,
    id: string
  ) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;

    if (crafting) return;

    const el = canvasRef.current;
    if (!el) return;
    const { width, height } = boundsFor(el);
    const maxX = Math.max(0, width - ITEM_W);
    const maxY = Math.max(0, height - ITEM_H);
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const x = clamp(d.origX + dx, 0, maxX);
    const y = clamp(d.origY + dy, 0, maxY);

    const base = itemsRef.current.find((i) => i.id === id);
    if (!base) return;

    const current: PlacedWithPos = { ...base, x, y };

    const partner = itemsRef.current.find(
      (p) =>
        p.id !== id &&
        boxesOverlap(current.x, current.y, p.x, p.y, ITEM_W, ITEM_H)
    );

    if (!partner) {
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, x, y } : p))
      );
      return;
    }

    const ok = await tryCombine(current, partner);
    if (!ok) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, x: d.origX, y: d.origY } : p
        )
      );
    }
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
        referenceId={referenceId}
        onClear={handleClearCraft}
        onCanvasDragOver={onCanvasDragOver}
        onCanvasDrop={onCanvasDrop}
        onItemPointerDown={onItemPointerDown}
        onItemPointerMove={onItemPointerMove}
        onItemPointerUp={onItemPointerUp}
      />
      <DiscoveryPanel discoveries={discoveries} />
    </section>
  );
}
