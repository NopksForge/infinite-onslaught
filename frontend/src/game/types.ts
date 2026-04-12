import type { DefenderStats, DefenderType } from "../components/Crafting/types";

export type { DefenderType, DefenderStats };

export type Defender = {
  id: string;
  name: string;
  emoji: string;
  type: DefenderType;
  x: number; // 0–100 (% of arena)
  y: number;
  hp: number;
  maxHp: number;
  lifetime: number; // seconds remaining
  attackCooldown: number; // seconds until next attack (0 = ready)
  // computed from base × multipliers
  moveSpeed: number; // %/s (0 for stationary)
  attackRange: number; // % distance
  attackDamage: number;
  spellArea: number; // % radius (spell type only)
  spellApplied: boolean; // true once spell damage dealt
};

export type Monster = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  speed: number; // %/s downward
  damage: number; // base damage dealt to player base on contact
  xpReward: number;
  x: number; // 0–100
  y: number; // 0–100
};

export type MonsterTemplate = Omit<Monster, "id" | "x" | "y">;

export type GameStatus = "idle" | "active" | "game_over";

export type GameState = {
  status: GameStatus;
  wave: number; // current wave number (0 before first wave)
  xp: number;
  level: number;
  baseHp: number;
  maxBaseHp: number;
  defenders: Defender[];
  monsters: Monster[];
  waveTimer: number; // seconds until next wave spawns
  spawnTimer: number; // seconds until next monster from queue spawns
  spawnQueue: MonsterTemplate[];
};

/** Item data needed to create a defender when dropped onto the arena. */
export type DeployableItem = {
  name: string;
  emoji: string;
  description: string;
  defender_type?: DefenderType;
  stats?: DefenderStats;
  /** UUID of the PlacedWithPos item in the crafting table — used to remove it on deploy. */
  craftingId?: string;
};
