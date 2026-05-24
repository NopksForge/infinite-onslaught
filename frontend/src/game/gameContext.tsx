import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BASE_DEFENDER,
  MANA_COST,
  MANA_REGEN_PER_SEC,
  MAX_MANA,
} from "./defenderStats";
import type { DefenderStats, DefenderType } from "../components/Crafting/types";
import {
  DISCOVERY_KEY,
  loadDiscoveries,
} from "../components/Crafting/discoveryStorage";
import { saveRun } from "./runStorage";
import type {
  Defender,
  DeployableItem,
  GameState,
  ModalKind,
  Monster,
  MonsterBehavior,
  MonsterTemplate,
  Projectile,
  Upgrade,
  UpgradeId,
  UpgradeStacks,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIRST_WAVE_DELAY = 12; // seconds before first wave
const WAVE_INTERVAL = 25; // seconds between waves
const SPAWN_INTERVAL = 1.5; // seconds between individual monster spawns
const BOSS_SPAWN_INTERVAL = 0; // boss waves spawn instantly
const BASE_Y = 88; // y% at which monsters hit the player base
const NEW_ELEMENT_EVERY = 3; // levels between NewElement modal triggers
const INITIAL_BASE_HP = 100;
const BOSS_WAVE_EVERY = 5; // every Nth wave is a boss wave
const PROJECTILE_SPEED = 70; // %/s — fast enough to read but not instant
const PROJECTILE_HIT_RADIUS = 2; // % distance at which a projectile connects
const HIT_FLASH_DURATION = 0.15; // seconds
const DEATH_FADE_DURATION = 0.35; // seconds
const BASE_SHAKE_DURATION = 0.35; // seconds
const ZIGZAG_AMPLITUDE = 12; // % horizontal swing
const ZIGZAG_FREQUENCY = 2.2; // radians/sec

const NEUTRAL_STACKS: UpgradeStacks = {
  speedMult: 1,
  damageMult: 1,
  rangeMult: 1,
  durationMult: 1,
  areaMult: 1,
  bonusMaxBaseHp: 0,
};

/** Catalog of upgrades the player can earn on level up. */
export const UPGRADE_CATALOG: Record<UpgradeId, Upgrade> = {
  swift_blades: {
    id: "swift_blades",
    name: "Swift Blades",
    emoji: "💨",
    description: "+20% defender move speed.",
  },
  rapid_fire: {
    id: "rapid_fire",
    name: "Rapid Fire",
    emoji: "💥",
    description: "+25% defender damage.",
  },
  long_sight: {
    id: "long_sight",
    name: "Long Sight",
    emoji: "🎯",
    description: "+20% attack range.",
  },
  reinforced_walls: {
    id: "reinforced_walls",
    name: "Reinforced Walls",
    emoji: "🏰",
    description: "+30 max base HP (and heals 30).",
  },
  eternal_flame: {
    id: "eternal_flame",
    name: "Eternal Flame",
    emoji: "🔥",
    description: "+30% defender HP & lifetime.",
  },
  wide_arc: {
    id: "wide_arc",
    name: "Wide Arc",
    emoji: "✦",
    description: "+25% spell / obstacle area.",
  },
};

const UPGRADE_IDS: UpgradeId[] = Object.keys(UPGRADE_CATALOG) as UpgradeId[];

/** Returns three distinct random upgrade ids. */
function rollUpgradeChoices(): UpgradeId[] {
  const pool = [...UPGRADE_IDS];
  const out: UpgradeId[] = [];
  while (out.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function applyUpgradeToStacks(
  stacks: UpgradeStacks,
  id: UpgradeId
): UpgradeStacks {
  switch (id) {
    case "swift_blades":
      return { ...stacks, speedMult: stacks.speedMult * 1.2 };
    case "rapid_fire":
      return { ...stacks, damageMult: stacks.damageMult * 1.25 };
    case "long_sight":
      return { ...stacks, rangeMult: stacks.rangeMult * 1.2 };
    case "reinforced_walls":
      return { ...stacks, bonusMaxBaseHp: stacks.bonusMaxBaseHp + 30 };
    case "eternal_flame":
      return { ...stacks, durationMult: stacks.durationMult * 1.3 };
    case "wide_arc":
      return { ...stacks, areaMult: stacks.areaMult * 1.25 };
  }
}

/** Base monster templates (per tier). Wave generation derives the actual swarm
 * and scales HP/speed/damage by wave number. */
const MONSTER_TIERS: Omit<MonsterTemplate, "behavior" | "isBoss">[] = [
  { name: "Goblin", emoji: "👺", hp: 30, maxHp: 30, speed: 8, damage: 8, xpReward: 10 },
  { name: "Orc", emoji: "👹", hp: 70, maxHp: 70, speed: 6, damage: 15, xpReward: 22 },
  { name: "Troll", emoji: "🧌", hp: 160, maxHp: 160, speed: 5, damage: 25, xpReward: 45 },
  { name: "Dragon", emoji: "🐉", hp: 380, maxHp: 380, speed: 7, damage: 55, xpReward: 90 },
];

/** Single boss template — scaled per wave for boss waves. */
const BOSS_TEMPLATE: Omit<MonsterTemplate, "behavior" | "isBoss"> = {
  name: "Behemoth",
  emoji: "💀",
  hp: 1200,
  maxHp: 1200,
  speed: 3.2,
  damage: 80,
  xpReward: 400,
};

// XP needed to reach level N (cumulative): level * (level-1) * 60
function xpForLevel(n: number): number {
  return (n - 1) * n * 60;
}

function computeLevel(xp: number): number {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

function xpProgress(xp: number, level: number): { current: number; needed: number } {
  return {
    current: xp - xpForLevel(level),
    needed: xpForLevel(level + 1) - xpForLevel(level),
  };
}

// ── State factory ─────────────────────────────────────────────────────────────

function initialState(): GameState {
  return {
    status: "idle",
    wave: 0,
    xp: 0,
    level: 1,
    baseHp: INITIAL_BASE_HP,
    maxBaseHp: INITIAL_BASE_HP,
    mana: MAX_MANA,
    maxMana: MAX_MANA,
    defenders: [],
    monsters: [],
    projectiles: [],
    waveTimer: FIRST_WAVE_DELAY,
    spawnTimer: 0,
    spawnQueue: [],
    modalQueue: [],
    upgrades: { ...NEUTRAL_STACKS },
    baseShake: 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildDefender(
  item: DeployableItem,
  x: number,
  y: number,
  upgrades: UpgradeStacks
): Defender {
  const dtype: DefenderType = item.defender_type ?? "alive_melee";
  const stats: DefenderStats = item.stats ?? {
    speed_mult: 1,
    damage_mult: 1,
    duration_mult: 1,
    range_mult: 1,
    area_mult: 1,
  };
  const base = BASE_DEFENDER[dtype];
  const hp = base.hp * stats.duration_mult * upgrades.durationMult;
  return {
    id: crypto.randomUUID(),
    name: item.name,
    emoji: item.emoji,
    type: dtype,
    x,
    y,
    hp,
    maxHp: hp,
    lifetime: base.lifetime * stats.duration_mult * upgrades.durationMult,
    attackCooldown: 0,
    moveSpeed: base.moveSpeed * stats.speed_mult * upgrades.speedMult,
    attackRange: base.attackRange * stats.range_mult * upgrades.rangeMult,
    attackDamage: base.attackDamage * stats.damage_mult * upgrades.damageMult,
    spellArea: base.spellArea * stats.area_mult * upgrades.areaMult,
    spellApplied: false,
    hitFlash: 0,
    dying: 0,
  };
}

/** Pick a movement behavior for a non-boss monster based on the wave number. */
function rollBehavior(wave: number): MonsterBehavior {
  // Waves 1–2: straight only. From wave 3+ zigzag/flying start mixing in.
  if (wave < 3) return "straight";
  const r = Math.random();
  // Heavier on straight early, ramping variety up to wave 8.
  const varietyChance = Math.min(0.55, 0.15 + (wave - 3) * 0.05);
  if (r < varietyChance) {
    // 60/40 split between zigzag and flying once variety triggers.
    return Math.random() < 0.6 ? "zigzag" : "flying";
  }
  return "straight";
}

function generateWave(wave: number): MonsterTemplate[] {
  // Boss waves: one chunky enemy instead of a swarm.
  if (wave > 0 && wave % BOSS_WAVE_EVERY === 0) {
    const tier = Math.min(
      Math.floor((wave - 1) / 2),
      MONSTER_TIERS.length - 1
    );
    // Bosses scale by wave, lightly tinted by current tier so later bosses
    // visually escalate (different emoji not strictly needed, scale is enough).
    const bossScale = Math.pow(1.15, wave - 1);
    const tierName = MONSTER_TIERS[tier].name;
    return [
      {
        name: `${tierName} Behemoth`,
        emoji: BOSS_TEMPLATE.emoji,
        hp: Math.round(BOSS_TEMPLATE.hp * bossScale),
        maxHp: Math.round(BOSS_TEMPLATE.hp * bossScale),
        speed: parseFloat((BOSS_TEMPLATE.speed * Math.pow(1.02, wave - 1)).toFixed(2)),
        damage: Math.round(BOSS_TEMPLATE.damage * bossScale),
        xpReward: Math.round(BOSS_TEMPLATE.xpReward * Math.pow(1.08, wave - 1)),
        behavior: "straight",
        isBoss: true,
      },
    ];
  }

  const tierIdx = Math.min(Math.floor((wave - 1) / 2), MONSTER_TIERS.length - 1);
  const base = MONSTER_TIERS[tierIdx];
  const scale = Math.pow(1.1, wave - 1);
  const hp = Math.round(base.hp * scale);
  const speed = parseFloat((base.speed * Math.pow(1.03, wave - 1)).toFixed(2));
  const damage = Math.round(base.damage * scale);
  const xpReward = Math.round(base.xpReward * Math.pow(1.05, wave - 1));
  const count = 2 + wave;

  return Array.from({ length: count }, () => ({
    name: base.name,
    emoji: base.emoji,
    hp,
    maxHp: hp,
    speed,
    damage,
    xpReward,
    behavior: rollBehavior(wave),
    isBoss: false,
  }));
}

function templateToMonster(t: MonsterTemplate): Monster {
  const spawnX = 5 + Math.random() * 90;
  return {
    ...t,
    id: crypto.randomUUID(),
    x: spawnX,
    y: 0,
    baseX: spawnX,
    zigPhase: Math.random() * Math.PI * 2,
    age: 0,
    hitFlash: 0,
    dying: 0,
  };
}

// ── Game tick (pure function) ─────────────────────────────────────────────────

function gameTick(state: GameState, dt: number): GameState {
  if (state.status !== "active") return state;
  // Freeze the world while any modal is pending.
  if (state.modalQueue.length > 0) return state;

  let {
    wave,
    xp,
    level,
    baseHp,
    waveTimer,
    spawnTimer,
    spawnQueue,
    mana,
    baseShake,
  } = state;
  const defenders: Defender[] = state.defenders.map((d) => ({ ...d }));
  const monsters: Monster[] = state.monsters.map((m) => ({ ...m }));
  const projectiles: Projectile[] = state.projectiles.map((p) => ({ ...p }));
  const newMonsters: Monster[] = [];
  const newProjectiles: Projectile[] = [];

  // Mana regen
  mana = Math.min(state.maxMana, mana + MANA_REGEN_PER_SEC * dt);
  // Base shake decay
  baseShake = Math.max(0, baseShake - dt);

  // 1. Wave timer → spawn next wave
  waveTimer = waveTimer - dt;
  if (waveTimer <= 0) {
    wave = wave + 1;
    spawnQueue = generateWave(wave);
    spawnTimer = 0;
    waveTimer = WAVE_INTERVAL;
  }

  // 2. Spawn from queue
  let newSpawnQueue = [...spawnQueue];
  const isBossWave =
    wave > 0 && wave % BOSS_WAVE_EVERY === 0 && newSpawnQueue.length > 0;
  spawnTimer = spawnTimer - dt;
  if (spawnTimer <= 0 && newSpawnQueue.length > 0) {
    const template = newSpawnQueue.shift()!;
    newMonsters.push(templateToMonster(template));
    spawnTimer = isBossWave ? BOSS_SPAWN_INTERVAL : SPAWN_INTERVAL;
  }

  const allMonsters: Monster[] = [...monsters, ...newMonsters];
  const deadMonsterIds = new Set<string>();
  let xpGained = 0;

  /** Apply damage to a monster, kicking off the flash + (on kill) the death
   * fade. Monsters that are already dying ignore further damage. */
  const damageMonster = (m: Monster, amount: number): void => {
    if (m.dying > 0 || deadMonsterIds.has(m.id)) return;
    m.hp -= amount;
    m.hitFlash = HIT_FLASH_DURATION;
    if (m.hp <= 0) {
      m.hp = 0;
      m.dying = DEATH_FADE_DURATION;
      deadMonsterIds.add(m.id);
      xpGained += m.xpReward;
    }
  };

  // 3. Move + tick monsters
  for (const m of allMonsters) {
    m.age += dt;
    m.hitFlash = Math.max(0, m.hitFlash - dt);
    if (m.dying > 0) {
      // Dying: keep falling at half speed but don't be targetable / collide.
      m.dying = Math.max(0, m.dying - dt);
      if (m.dying === 0) deadMonsterIds.add(m.id); // fade finished → cull below
      m.y += m.speed * dt * 0.5;
      continue;
    }
    m.y += m.speed * dt;
    if (m.behavior === "zigzag") {
      m.x = m.baseX + Math.sin(m.age * ZIGZAG_FREQUENCY + m.zigPhase) * ZIGZAG_AMPLITUDE;
      m.x = Math.max(2, Math.min(98, m.x));
    }
    // flying & straight: no horizontal drift. (flying is distinguished only by
    // immunity to obstacle damage, handled below.)
  }

  // 4. Process defenders
  const deadDefenderIds = new Set<string>();

  for (const d of defenders) {
    d.hitFlash = Math.max(0, d.hitFlash - dt);
    if (d.dying > 0) {
      d.dying = Math.max(0, d.dying - dt);
      if (d.dying === 0) deadDefenderIds.add(d.id);
      continue;
    }

    d.lifetime -= dt;
    if (d.lifetime <= 0) {
      d.dying = DEATH_FADE_DURATION;
      continue;
    }
    d.attackCooldown = Math.max(0, d.attackCooldown - dt);

    if (d.type === "spell") {
      if (!d.spellApplied) {
        d.spellApplied = true;
        for (const m of allMonsters) {
          if (m.dying > 0) continue;
          if (dist(d.x, d.y, m.x, m.y) <= d.spellArea) {
            damageMonster(m, d.attackDamage);
          }
        }
      }
      continue;
    }

    if (d.type === "obstacle") {
      // Damage non-flying monsters in contact range
      if (d.attackCooldown === 0) {
        for (const m of allMonsters) {
          if (m.dying > 0) continue;
          if (m.behavior === "flying") continue;
          if (dist(d.x, d.y, m.x, m.y) <= d.attackRange) {
            damageMonster(m, d.attackDamage);
          }
        }
        d.attackCooldown = 0.5;
      }
      // Take damage from non-flying monsters in contact
      for (const m of allMonsters) {
        if (m.dying > 0) continue;
        if (m.behavior === "flying") continue;
        if (dist(d.x, d.y, m.x, m.y) <= d.attackRange + 1) {
          d.hp -= m.damage * dt * 0.3;
          d.hitFlash = HIT_FLASH_DURATION;
        }
      }
      if (d.hp <= 0) {
        d.hp = 0;
        d.dying = DEATH_FADE_DURATION;
      }
      continue;
    }

    // alive_melee: move toward nearest live monster, attack in range
    if (d.type === "alive_melee") {
      const alive = allMonsters.filter((m) => m.dying === 0);
      if (alive.length > 0) {
        let nearest = alive[0];
        let nearestDist = dist(d.x, d.y, nearest.x, nearest.y);
        for (const m of alive) {
          const dd = dist(d.x, d.y, m.x, m.y);
          if (dd < nearestDist) {
            nearestDist = dd;
            nearest = m;
          }
        }
        if (nearestDist > d.attackRange) {
          const dx = nearest.x - d.x;
          const dy = nearest.y - d.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          d.x += (dx / len) * d.moveSpeed * dt;
          d.y += (dy / len) * d.moveSpeed * dt;
          d.x = Math.max(0, Math.min(100, d.x));
          d.y = Math.max(0, Math.min(100, d.y));
        } else if (d.attackCooldown === 0) {
          damageMonster(nearest, d.attackDamage);
          d.attackCooldown = 1.2;
        }
      }
    }

    // alive_range: stationary, spawn a projectile toward nearest target in range
    if (d.type === "alive_range") {
      if (d.attackCooldown === 0) {
        const inRange = allMonsters.filter(
          (m) => m.dying === 0 && dist(d.x, d.y, m.x, m.y) <= d.attackRange
        );
        if (inRange.length > 0) {
          let nearest = inRange[0];
          let nearestDist = dist(d.x, d.y, nearest.x, nearest.y);
          for (const m of inRange) {
            const dd = dist(d.x, d.y, m.x, m.y);
            if (dd < nearestDist) {
              nearestDist = dd;
              nearest = m;
            }
          }
          newProjectiles.push({
            id: crypto.randomUUID(),
            x: d.x,
            y: d.y,
            targetId: nearest.id,
            damage: d.attackDamage,
            speed: PROJECTILE_SPEED,
            color: "blue-400",
          });
          d.attackCooldown = 1.5;
        }
      }
    }
  }

  // 4b. Move projectiles; resolve hits
  const allProjectiles = [...projectiles, ...newProjectiles];
  const liveProjectiles: Projectile[] = [];
  const monsterById = new Map<string, Monster>();
  for (const m of allMonsters) monsterById.set(m.id, m);
  for (const p of allProjectiles) {
    const target = monsterById.get(p.targetId);
    // Target gone or already dying — projectile fizzles.
    if (!target || target.dying > 0) continue;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = p.speed * dt;
    if (len <= step + PROJECTILE_HIT_RADIUS) {
      // Hit
      damageMonster(target, p.damage);
      continue;
    }
    p.x += (dx / len) * step;
    p.y += (dy / len) * step;
    // Cull off-arena projectiles defensively
    if (p.x < -5 || p.x > 105 || p.y < -5 || p.y > 105) continue;
    liveProjectiles.push(p);
  }

  // 5. Monsters that reach the base deal damage
  let baseDamage = 0;
  const reachedBase = new Set<string>();
  for (const m of allMonsters) {
    if (m.dying > 0) continue;
    if (m.y >= BASE_Y) {
      baseDamage += m.damage;
      reachedBase.add(m.id);
    }
  }
  const newBaseHp = Math.max(0, baseHp - baseDamage);
  if (baseDamage > 0) baseShake = BASE_SHAKE_DURATION;

  // 6. XP + level
  const newXp = xp + xpGained;
  const newLevel = computeLevel(newXp);

  // 6a. Enqueue modals on level transitions (one level_up per gained level,
  // plus a new_element every Nth level).
  const newModalQueue = [...state.modalQueue];
  if (newLevel > level) {
    for (let lvl = level + 1; lvl <= newLevel; lvl++) {
      newModalQueue.push("level_up");
      if (lvl % NEW_ELEMENT_EVERY === 0) {
        newModalQueue.push("new_element");
      }
    }
  }

  // 7. Filter dead entities
  // - Monsters: remove once dying fade has finished OR they reached the base.
  //   Keep them around (visible but faded) while dying > 0.
  const liveDefenders = defenders.filter(
    (d) => !deadDefenderIds.has(d.id)
  );
  const liveMonsters = allMonsters.filter((m) => {
    if (reachedBase.has(m.id)) return false;
    if (m.dying > 0) return true; // still fading out — keep rendering
    if (deadMonsterIds.has(m.id)) return false; // shouldn't happen (dying set above)
    return true;
  });

  return {
    ...state,
    wave,
    xp: newXp,
    level: newLevel,
    baseHp: newBaseHp,
    mana,
    defenders: liveDefenders,
    monsters: liveMonsters,
    projectiles: liveProjectiles,
    waveTimer,
    spawnTimer,
    spawnQueue: newSpawnQueue,
    modalQueue: newModalQueue,
    baseShake,
    status: newBaseHp <= 0 ? "game_over" : "active",
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

type GameContextValue = {
  gameState: GameState;
  xpProgress: { current: number; needed: number };
  /** Head of the modal queue, or null when nothing is pending. */
  activeModal: ModalKind | null;
  /** Three random upgrade ids for the LevelUp modal, regenerated per pop. */
  pendingUpgradeChoices: Upgrade[];
  /** Incremented when an element is unlocked, so the resource panel re-fetches. */
  resourcesRevision: number;
  startGame: () => void;
  resetGame: () => void;
  exitToMenu: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  /** Returns true if the defender was deployed (mana sufficient + status ok). */
  deployDefender: (
    item: DeployableItem,
    arenaX: number,
    arenaY: number
  ) => boolean;
  removeFromCraft: (id: string) => void;
  applyUpgrade: (id: UpgradeId) => void;
  /** Called by NewElement modal after the chosen element has been persisted. */
  applyNewElement: (name: string) => void;
  /** ID of item pending removal from crafting table after arena drop. */
  lastDeployedId: string | null;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

type GameProviderProps = {
  children: React.ReactNode;
  /** Called by exitToMenu (Back to menu in GameOverModal). */
  onExit?: () => void;
};

export function GameProvider({ children, onExit }: GameProviderProps) {
  const stateRef = useRef<GameState>(initialState());
  const [renderState, setRenderState] = useState<GameState>(initialState());
  const [lastDeployedId, setLastDeployedId] = useState<string | null>(null);
  const [resourcesRevision, setResourcesRevision] = useState(0);
  const [pendingUpgradeChoices, setPendingUpgradeChoices] = useState<Upgrade[]>(
    []
  );
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const lastActiveModalRef = useRef<ModalKind | null>(null);

  const syncState = useCallback(() => {
    setRenderState({ ...stateRef.current });
  }, []);

  // RAF game loop
  const loop = useCallback(
    (ts: number) => {
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1);
      lastTsRef.current = ts;
      stateRef.current = gameTick(stateRef.current, dt);
      syncState();
      rafRef.current = requestAnimationFrame(loop);
    },
    [syncState]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame((ts) => {
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // When the head of the modal queue becomes 'level_up' (i.e. a fresh
  // LevelUp modal is being opened), roll a new set of upgrade choices.
  const activeModal = renderState.modalQueue[0] ?? null;
  useEffect(() => {
    const prev = lastActiveModalRef.current;
    lastActiveModalRef.current = activeModal;
    if (activeModal === "level_up" && prev !== "level_up") {
      setPendingUpgradeChoices(
        rollUpgradeChoices().map((id) => UPGRADE_CATALOG[id])
      );
    }
  }, [activeModal]);

  const startGame = useCallback(() => {
    stateRef.current = { ...stateRef.current, status: "active" };
    syncState();
  }, [syncState]);

  const resetGame = useCallback(() => {
    stateRef.current = initialState();
    stateRef.current.status = "active";
    stateRef.current.waveTimer = FIRST_WAVE_DELAY;
    syncState();
    setLastDeployedId(null);
    setPendingUpgradeChoices([]);
  }, [syncState]);

  const exitToMenu = useCallback(() => {
    stateRef.current = initialState();
    syncState();
    setLastDeployedId(null);
    setPendingUpgradeChoices([]);
    onExit?.();
  }, [onExit, syncState]);

  const pauseGame = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "active") return;
    stateRef.current = { ...current, status: "paused" };
    syncState();
  }, [syncState]);

  const resumeGame = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "paused") return;
    stateRef.current = { ...current, status: "active" };
    syncState();
  }, [syncState]);

  // Esc toggles pause while the run is in progress (ignored during modals,
  // idle/start screen, and game-over).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = stateRef.current;
      if (s.modalQueue.length > 0) return;
      if (s.status === "active") {
        stateRef.current = { ...s, status: "paused" };
        syncState();
      } else if (s.status === "paused") {
        stateRef.current = { ...s, status: "active" };
        syncState();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [syncState]);

  // Persist run stats once on transition into game_over.
  const savedRunRef = useRef(false);
  useEffect(() => {
    if (renderState.status !== "game_over") {
      savedRunRef.current = false;
      return;
    }
    if (savedRunRef.current) return;
    savedRunRef.current = true;
    saveRun({
      wave: renderState.wave,
      xp: renderState.xp,
      level: renderState.level,
      discoveries: loadDiscoveries(DISCOVERY_KEY).length,
      endedAt: Date.now(),
    });
  }, [renderState.status, renderState.wave, renderState.xp, renderState.level]);

  const deployDefender = useCallback(
    (item: DeployableItem, arenaX: number, arenaY: number): boolean => {
      const current = stateRef.current;
      if (current.status === "game_over") return false;
      const dtype: DefenderType = item.defender_type ?? "alive_melee";
      const cost = MANA_COST[dtype];
      if (current.mana < cost) return false;
      const defender = buildDefender(item, arenaX, arenaY, current.upgrades);
      stateRef.current = {
        ...current,
        mana: current.mana - cost,
        defenders: [...current.defenders, defender],
      };
      syncState();
      return true;
    },
    [syncState]
  );

  const removeFromCraft = useCallback((id: string) => {
    setLastDeployedId(id);
  }, []);

  /** Pops the head of the modal queue. */
  const popModal = useCallback(() => {
    const current = stateRef.current;
    if (current.modalQueue.length === 0) return;
    stateRef.current = {
      ...current,
      modalQueue: current.modalQueue.slice(1),
    };
    syncState();
  }, [syncState]);

  const applyUpgrade = useCallback(
    (id: UpgradeId) => {
      const current = stateRef.current;
      const upgrades = applyUpgradeToStacks(current.upgrades, id);
      let { baseHp, maxBaseHp } = current;
      if (id === "reinforced_walls") {
        maxBaseHp = maxBaseHp + 30;
        baseHp = Math.min(maxBaseHp, baseHp + 30);
      }
      stateRef.current = {
        ...current,
        upgrades,
        baseHp,
        maxBaseHp,
        modalQueue: current.modalQueue.slice(1),
      };
      syncState();
    },
    [syncState]
  );

  const applyNewElement = useCallback(
    (_name: string) => {
      // Backend already persisted; just advance the queue and bump resources.
      setResourcesRevision((n) => n + 1);
      popModal();
    },
    [popModal]
  );

  const progress = xpProgress(renderState.xp, renderState.level);

  return (
    <GameContext.Provider
      value={{
        gameState: renderState,
        xpProgress: progress,
        activeModal,
        pendingUpgradeChoices,
        resourcesRevision,
        startGame,
        resetGame,
        exitToMenu,
        pauseGame,
        resumeGame,
        deployDefender,
        removeFromCraft,
        applyUpgrade,
        applyNewElement,
        lastDeployedId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
