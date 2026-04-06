import type { DiscoveryItem } from "./types";

const PREFIX = "craft-discoveries:";

function normalizeCreatedFrom(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return [];
  const out: string[][] = [];
  for (const row of raw) {
    if (!Array.isArray(row)) continue;
    const parts = row.filter((c): c is string => typeof c === "string");
    if (parts.length > 0) out.push(parts);
  }
  return out;
}

function isDiscoveryRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object";
}

export function loadDiscoveries(referenceId: string): DiscoveryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PREFIX + referenceId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: DiscoveryItem[] = [];
    for (const el of parsed) {
      if (!isDiscoveryRecord(el)) continue;
      const name = el.name;
      const emoji = el.emoji;
      const description = el.description;
      if (
        typeof name !== "string" ||
        typeof emoji !== "string" ||
        typeof description !== "string"
      ) {
        continue;
      }
      items.push({
        name,
        emoji,
        description,
        created_from: normalizeCreatedFrom(el.created_from),
      });
    }
    return items;
  } catch {
    return [];
  }
}

export function saveDiscoveries(
  referenceId: string,
  items: DiscoveryItem[]
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PREFIX + referenceId, JSON.stringify(items));
}

export function clearDiscoveriesStorage(referenceId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PREFIX + referenceId);
}
