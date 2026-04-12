import { Craft, ClearCraft, GetResources } from "../../../wailsjs/go/main/App";
import type { CraftResultData, ResourceItem } from "./types";

const API = "http://localhost:8081/api";

/** True once window['go'] bridge has been detected. */
let bridgeAvailable = false;

function hasBridge(): boolean {
  if (bridgeAvailable) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bridgeAvailable = !!(window as any)["go"]?.["main"]?.["App"];
  return bridgeAvailable;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function httpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function httpDelete(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ── public API ───────────────────────────────────────────────────────────────

export type GetResourcesResult =
  | { ok: true; items: ResourceItem[] }
  | { ok: false; message: string };

export async function getResources(): Promise<GetResourcesResult> {
  try {
    if (hasBridge()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ok: true, items: (await GetResources()) as any as ResourceItem[] };
    }
    return { ok: true, items: await httpGet<ResourceItem[]>("/resources") };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

export async function postCraft(
  item1Name: string,
  item2Name: string
): Promise<CraftResultData | null> {
  try {
    if (hasBridge()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await Craft(item1Name, item2Name) as any;
      if (!r) return null;
      return {
        name: r.name,
        description: r.description,
        emoji: r.emoji,
        created_from: Array.isArray(r.created_from) ? r.created_from : [],
        is_new_item: Boolean(r.is_new_item),
        is_new_combination: Boolean(r.is_new_combination),
        defender_type: r.defender_type || undefined,
        stats: r.stats || undefined,
      };
    }
    return await httpPost<CraftResultData>("/craft", {
      item1: item1Name,
      item2: item2Name,
    });
  } catch {
    return null;
  }
}

export async function deleteCraft(): Promise<boolean> {
  try {
    if (hasBridge()) {
      await ClearCraft();
    } else {
      await httpDelete("/craft");
    }
    return true;
  } catch {
    return false;
  }
}
