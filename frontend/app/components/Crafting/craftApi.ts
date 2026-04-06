import type {
  ClearCraftResponse,
  CraftResponse,
  CraftResultData,
  ResourceItem,
  ResourcesResponse,
} from "./types";

export const CRAFT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type GetResourcesResult =
  | { ok: true; items: ResourceItem[] }
  | { ok: false; message: string };

export async function getResources(
  referenceId: string
): Promise<GetResourcesResult> {
  try {
    const res = await fetch(`${CRAFT_API_BASE}/resources`, {
      headers: { "x-reference-id": referenceId },
    });
    const json = (await res.json()) as ResourcesResponse;
    if (json.code === "000" && json.data?.items) {
      return { ok: true, items: json.data.items };
    }
    return {
      ok: false,
      message: json.message ?? "Could not load resources",
    };
  } catch {
    return { ok: false, message: "Could not load resources" };
  }
}

export async function postCraft(
  referenceId: string,
  item1Name: string,
  item2Name: string
): Promise<CraftResultData | null> {
  try {
    const res = await fetch(`${CRAFT_API_BASE}/craft`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-reference-id": referenceId,
      },
      body: JSON.stringify({
        item1_name: item1Name,
        item2_name: item2Name,
      }),
    });
    const json = (await res.json()) as CraftResponse;
    if (json.code !== "000" || !json.data) {
      return null;
    }
    const d = json.data;
    return {
      name: d.name,
      description: d.description,
      emoji: d.emoji,
      created_from: Array.isArray(d.created_from) ? d.created_from : [],
      is_new_item: Boolean(d.is_new_item),
      is_new_combination: Boolean(d.is_new_combination),
    };
  } catch {
    return null;
  }
}

export async function deleteCraft(referenceId: string): Promise<boolean> {
  try {
    const res = await fetch(`${CRAFT_API_BASE}/craft`, {
      method: "DELETE",
      headers: { "x-reference-id": referenceId },
    });
    const json = (await res.json()) as ClearCraftResponse;
    return json.code === "000";
  } catch {
    return false;
  }
}
