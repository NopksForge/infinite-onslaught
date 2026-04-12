export type DefenderType = "alive_melee" | "alive_range" | "spell" | "obstacle";

export type DefenderStats = {
  speed_mult: number;
  damage_mult: number;
  duration_mult: number;
  range_mult: number;
  area_mult: number;
};

export type ResourceItem = {
  name: string;
  description: string;
  emoji: string;
  defender_type?: DefenderType;
  stats?: DefenderStats;
};

export type PlacedItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  defender_type?: DefenderType;
  stats?: DefenderStats;
};

export type PlacedItemDraft = Omit<PlacedItem, "id">;

export type PlacedWithPos = PlacedItem & { x: number; y: number };

/** Successful Craft() result (includes discovery flags). */
export type CraftResultData = {
  name: string;
  description: string;
  emoji: string;
  created_from: string[][];
  is_new_item: boolean;
  is_new_combination: boolean;
  defender_type?: DefenderType;
  stats?: DefenderStats;
};

/** Persisted discovery entries (session storage). */
export type DiscoveryItem = {
  name: string;
  description: string;
  emoji: string;
  created_from: string[][];
};
