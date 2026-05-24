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
  /** Seconds remaining of the white "hit" flash. */
  hitFlash: number;
  /** Seconds remaining of the death fade-out (0 = alive). */
  dying: number;
};

export type MonsterBehavior = "straight" | "zigzag" | "flying";

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
  behavior: MonsterBehavior;
  isBoss: boolean;
  /** Anchor x for zigzag oscillation. */
  baseX: number;
  /** Per-instance phase offset (radians) so zigzag patterns desync. */
  zigPhase: number;
  /** Seconds since this monster spawned (used by zigzag). */
  age: number;
  /** Seconds remaining of the white "hit" flash. */
  hitFlash: number;
  /** Seconds remaining of the death fade (0 = alive, >0 = dying, non-colliding). */
  dying: number;
};

/** Template stored in the spawn queue. Per-instance fields (id/x/y/age/hitFlash/
 * dying/baseX/zigPhase) are filled in when the monster actually spawns. */
export type MonsterTemplate = Omit<
  Monster,
  "id" | "x" | "y" | "baseX" | "zigPhase" | "age" | "hitFlash" | "dying"
>;

export type Projectile = {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number; // %/s
  /** Tailwind color class fragment (e.g. "blue-400"). */
  color: string;
};

export type GameStatus = "idle" | "active" | "paused" | "game_over";

export type ModalKind = "level_up" | "new_element";

export type UpgradeId =
  | "swift_blades"
  | "rapid_fire"
  | "long_sight"
  | "reinforced_walls"
  | "eternal_flame"
  | "wide_arc";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  emoji: string;
  description: string;
};

/** Cumulative multipliers applied on top of per-item DefenderStats. */
export type UpgradeStacks = {
  speedMult: number;
  damageMult: number;
  rangeMult: number;
  durationMult: number;
  areaMult: number;
  /** Bonus HP added to the player base on top of the initial 100. */
  bonusMaxBaseHp: number;
};

export type GameState = {
  status: GameStatus;
  wave: number; // current wave number (0 before first wave)
  xp: number;
  level: number;
  baseHp: number;
  maxBaseHp: number;
  mana: number;
  maxMana: number;
  defenders: Defender[];
  monsters: Monster[];
  projectiles: Projectile[];
  waveTimer: number; // seconds until next wave spawns
  spawnTimer: number; // seconds until next monster from queue spawns
  spawnQueue: MonsterTemplate[];
  /** Queue of modals waiting to be presented; head is the active modal. */
  modalQueue: ModalKind[];
  /** Active upgrade multipliers — applied when new defenders are built. */
  upgrades: UpgradeStacks;
  /** Seconds remaining of arena shake (set when the base is hit). */
  baseShake: number;
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
