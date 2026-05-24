import type { DefenderStats, DefenderType } from "../components/Crafting/types";
import type { UpgradeStacks } from "./types";

/** Base stats for each defender type. Per-item DefenderStats and run-wide
 * UpgradeStacks are layered on top. Kept in its own module so the crafting
 * tooltip can preview values without importing the whole game context. */
export const BASE_DEFENDER: Record<
  DefenderType,
  {
    hp: number;
    moveSpeed: number;
    attackRange: number;
    attackDamage: number;
    lifetime: number;
    spellArea: number;
    /** Seconds between attacks; used for projectile cadence + DPS preview. */
    attackCooldown: number;
  }
> = {
  alive_melee: {
    hp: 100,
    moveSpeed: 22,
    attackRange: 5,
    attackDamage: 14,
    lifetime: 28,
    spellArea: 0,
    attackCooldown: 1.2,
  },
  alive_range: {
    hp: 70,
    moveSpeed: 0,
    attackRange: 22,
    attackDamage: 11,
    lifetime: 22,
    spellArea: 0,
    attackCooldown: 1.5,
  },
  spell: {
    hp: 1,
    moveSpeed: 0,
    attackRange: 0,
    attackDamage: 70,
    lifetime: 0.8,
    spellArea: 13,
    attackCooldown: 0,
  },
  obstacle: {
    hp: 280,
    moveSpeed: 0,
    attackRange: 4,
    attackDamage: 4,
    lifetime: 45,
    spellArea: 0,
    attackCooldown: 0.5,
  },
};

/** Mana required to deploy each defender type. */
export const MANA_COST: Record<DefenderType, number> = {
  alive_melee: 20,
  alive_range: 25,
  spell: 35,
  obstacle: 15,
};

export const MAX_MANA = 100;
export const MANA_REGEN_PER_SEC = 6;

export type DefenderPreview = {
  type: DefenderType;
  hp: number;
  damage: number;
  range: number;
  lifetime: number;
  area: number;
  moveSpeed: number;
  manaCost: number;
};

const NEUTRAL: UpgradeStacks = {
  speedMult: 1,
  damageMult: 1,
  rangeMult: 1,
  durationMult: 1,
  areaMult: 1,
  bonusMaxBaseHp: 0,
};

/** Returns the live (post-upgrade) stats for a craftable item. */
export function previewDefenderStats(
  item: { defender_type?: DefenderType; stats?: DefenderStats },
  upgrades: UpgradeStacks = NEUTRAL
): DefenderPreview {
  const type: DefenderType = item.defender_type ?? "alive_melee";
  const stats: DefenderStats = item.stats ?? {
    speed_mult: 1,
    damage_mult: 1,
    duration_mult: 1,
    range_mult: 1,
    area_mult: 1,
  };
  const base = BASE_DEFENDER[type];
  return {
    type,
    hp: base.hp * stats.duration_mult * upgrades.durationMult,
    damage: base.attackDamage * stats.damage_mult * upgrades.damageMult,
    range: base.attackRange * stats.range_mult * upgrades.rangeMult,
    lifetime: base.lifetime * stats.duration_mult * upgrades.durationMult,
    area: base.spellArea * stats.area_mult * upgrades.areaMult,
    moveSpeed: base.moveSpeed * stats.speed_mult * upgrades.speedMult,
    manaCost: MANA_COST[type],
  };
}
