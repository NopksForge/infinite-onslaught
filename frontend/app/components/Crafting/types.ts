export type ResourceItem = {
  name: string;
  description: string;
  emoji: string;
};

export type ResourcesResponse = {
  code: string;
  message: string;
  data: { items: ResourceItem[] } | null;
};

export type PlacedItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export type PlacedItemDraft = Omit<PlacedItem, "id">;

export type PlacedWithPos = PlacedItem & { x: number; y: number };

/** Successful POST /craft payload (includes discovery flags). */
export type CraftResultData = {
  name: string;
  description: string;
  emoji: string;
  created_from: string[][];
  is_new_item: boolean;
  is_new_combination: boolean;
};

/** Persisted discovery entries (client session storage). */
export type DiscoveryItem = {
  name: string;
  description: string;
  emoji: string;
  created_from: string[][];
};

export type CraftResponse = {
  code: string;
  message: string;
  data: CraftResultData | null;
};

export type ClearCraftResponse = {
  code: string;
  message: string;
};
