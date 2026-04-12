import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DefenderStats, DefenderType } from "../components/Crafting/types";
import type {
  Defender,
  DeployableItem,
  GameState,
  Monster,
  MonsterTemplate,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIRST_WAVE_DELAY = 12; // seconds before first wave
const WAVE_INTERVAL = 25; // seconds between waves
const SPAWN_INTERVAL = 1.5; // seconds between individual monster spawns
const BASE_Y = 88; // y% at which monsters hit the player base

/** Base stats for each defender type (multiplied by item stats). */
const BASE_DEFENDER: Record<
  DefenderType,
  {
    hp: number;
    moveSpeed: number;
    attackRange: number;
    attackDamage: number;
    lifetime: number;
    spellArea: number;
  }
> = {
  alive_melee: {
    hp: 100,
    moveSpeed: 22,
    attackRange: 5,
    attackDamage: 14,
    lifetime: 28,
    spellArea: 0,
  },
  alive_range: {
    hp: 70,
    moveSpeed: 0,
    attackRange: 22,
    attackDamage: 11,
    lifetime: 22,
    spellArea: 0,
  },
  spell: {
    hp: 1,
    moveSpeed: 0,
    attackRange: 0,
    attackDamage: 70,
    lifetime: 0.8,
    spellArea: 13,
  },
  obstacle: {
    hp: 280,
    moveSpeed: 0,
    attackRange: 4,
    attackDamage: 4,
    lifetime: 45,
    spellArea: 0,
  },
};

/** Monster templates by tier (chosen by wave number). */
const MONSTER_TIERS: MonsterTemplate[] = [
  { name: "Goblin", emoji: "👺", hp: 30, maxHp: 30, speed: 8, damage: 8, xpReward: 10 },
  { name: "Orc", emoji: "👹", hp: 70, maxHp: 70, speed: 6, damage: 15, xpReward: 22 },
  { name: "Troll", emoji: "🧌", hp: 160, maxHp: 160, speed: 5, damage: 25, xpReward: 45 },
  { name: "Dragon", emoji: "🐉", hp: 380, maxHp: 380, speed: 7, damage: 55, xpReward: 90 },
];

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
    baseHp: 100,
    maxBaseHp: 100,
    defenders: [],
    monsters: [],
    waveTimer: FIRST_WAVE_DELAY,
    spawnTimer: 0,
    spawnQueue: [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildDefender(item: DeployableItem, x: number, y: number): Defender {
  const dtype: DefenderType = item.defender_type ?? "alive_melee";
  const stats: DefenderStats = item.stats ?? {
    speed_mult: 1,
    damage_mult: 1,
    duration_mult: 1,
    range_mult: 1,
    area_mult: 1,
  };
  const base = BASE_DEFENDER[dtype];
  return {
    id: crypto.randomUUID(),
    name: item.name,
    emoji: item.emoji,
    type: dtype,
    x,
    y,
    hp: base.hp * stats.duration_mult,
    maxHp: base.hp * stats.duration_mult,
    lifetime: base.lifetime * stats.duration_mult,
    attackCooldown: 0,
    moveSpeed: base.moveSpeed * stats.speed_mult,
    attackRange: base.attackRange * stats.range_mult,
    attackDamage: base.attackDamage * stats.damage_mult,
    spellArea: base.spellArea * stats.area_mult,
    spellApplied: false,
  };
}

function generateWave(wave: number): MonsterTemplate[] {
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
  }));
}

// ── Game tick (pure function) ─────────────────────────────────────────────────

function gameTick(state: GameState, dt: number): GameState {
  if (state.status !== "active") return state;

  let { wave, xp, level, baseHp, waveTimer, spawnTimer, spawnQueue } = state;
  const defenders: Defender[] = state.defenders.map((d) => ({ ...d }));
  const monsters: Monster[] = state.monsters.map((m) => ({ ...m }));
  const newMonsters: Monster[] = [];

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
  spawnTimer = spawnTimer - dt;
  if (spawnTimer <= 0 && newSpawnQueue.length > 0) {
    const template = newSpawnQueue.shift()!;
    newMonsters.push({
      ...template,
      id: crypto.randomUUID(),
      x: 5 + Math.random() * 90,
      y: 0,
    });
    spawnTimer = SPAWN_INTERVAL;
  }

  const allMonsters: Monster[] = [...monsters, ...newMonsters];
  const deadMonsterIds = new Set<string>();
  let xpGained = 0;

  // 3. Move monsters toward base
  for (const m of allMonsters) {
    m.y += m.speed * dt;
  }

  // 4. Process defenders
  const deadDefenderIds = new Set<string>();

  for (const d of defenders) {
    d.lifetime -= dt;
    if (d.lifetime <= 0) {
      deadDefenderIds.add(d.id);
      continue;
    }
    d.attackCooldown = Math.max(0, d.attackCooldown - dt);

    if (d.type === "spell") {
      if (!d.spellApplied) {
        d.spellApplied = true;
        for (const m of allMonsters) {
          if (dist(d.x, d.y, m.x, m.y) <= d.spellArea) {
            m.hp -= d.attackDamage;
            if (m.hp <= 0 && !deadMonsterIds.has(m.id)) {
              deadMonsterIds.add(m.id);
              xpGained += m.xpReward;
            }
          }
        }
      }
      continue;
    }

    if (d.type === "obstacle") {
      // Damage monsters in contact range
      if (d.attackCooldown === 0) {
        for (const m of allMonsters) {
          if (dist(d.x, d.y, m.x, m.y) <= d.attackRange) {
            m.hp -= d.attackDamage;
            if (m.hp <= 0 && !deadMonsterIds.has(m.id)) {
              deadMonsterIds.add(m.id);
              xpGained += m.xpReward;
            }
          }
        }
        d.attackCooldown = 0.5;
      }
      // Take damage from monsters in contact
      for (const m of allMonsters) {
        if (!deadMonsterIds.has(m.id) && dist(d.x, d.y, m.x, m.y) <= d.attackRange + 1) {
          d.hp -= m.damage * dt * 0.3;
        }
      }
      if (d.hp <= 0) deadDefenderIds.add(d.id);
      continue;
    }

    // alive_melee: move toward nearest monster, attack in range
    if (d.type === "alive_melee") {
      const alive = allMonsters.filter((m) => !deadMonsterIds.has(m.id));
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
          nearest.hp -= d.attackDamage;
          d.attackCooldown = 1.2;
          if (nearest.hp <= 0 && !deadMonsterIds.has(nearest.id)) {
            deadMonsterIds.add(nearest.id);
            xpGained += nearest.xpReward;
          }
        }
      }
    }

    // alive_range: stationary, attack nearest monster in range
    if (d.type === "alive_range") {
      if (d.attackCooldown === 0) {
        const inRange = allMonsters.filter(
          (m) => !deadMonsterIds.has(m.id) && dist(d.x, d.y, m.x, m.y) <= d.attackRange
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
          nearest.hp -= d.attackDamage;
          d.attackCooldown = 1.5;
          if (nearest.hp <= 0 && !deadMonsterIds.has(nearest.id)) {
            deadMonsterIds.add(nearest.id);
            xpGained += nearest.xpReward;
          }
        }
      }
    }
  }

  // 5. Monsters that reach the base deal damage
  let baseDamage = 0;
  const reachedBase = new Set<string>();
  for (const m of allMonsters) {
    if (m.y >= BASE_Y && !deadMonsterIds.has(m.id)) {
      baseDamage += m.damage;
      reachedBase.add(m.id);
    }
  }
  const newBaseHp = Math.max(0, baseHp - baseDamage);

  // 6. XP + level
  const newXp = xp + xpGained;
  const newLevel = computeLevel(newXp);

  // 7. Filter dead entities
  const liveDefenders = defenders.filter(
    (d) => !deadDefenderIds.has(d.id)
  );
  const liveMonsters = allMonsters.filter(
    (m) => !deadMonsterIds.has(m.id) && !reachedBase.has(m.id)
  );

  return {
    ...state,
    wave,
    xp: newXp,
    level: newLevel,
    baseHp: newBaseHp,
    defenders: liveDefenders,
    monsters: liveMonsters,
    waveTimer,
    spawnTimer,
    spawnQueue: newSpawnQueue,
    status: newBaseHp <= 0 ? "game_over" : "active",
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

type GameContextValue = {
  gameState: GameState;
  xpProgress: { current: number; needed: number };
  startGame: () => void;
  resetGame: () => void;
  deployDefender: (item: DeployableItem, arenaX: number, arenaY: number) => void;
  removeFromCraft: (id: string) => void;
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const stateRef = useRef<GameState>(initialState());
  const [renderState, setRenderState] = useState<GameState>(initialState());
  const [lastDeployedId, setLastDeployedId] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

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

  const startGame = useCallback(() => {
    stateRef.current = { ...stateRef.current, status: "active" };
    syncState();
  }, [syncState]);

  const resetGame = useCallback(() => {
    stateRef.current = initialState();
    stateRef.current.status = "active";
    stateRef.current.waveTimer = FIRST_WAVE_DELAY;
    syncState();
  }, [syncState]);

  const deployDefender = useCallback(
    (item: DeployableItem, arenaX: number, arenaY: number) => {
      const defender = buildDefender(item, arenaX, arenaY);
      const current = stateRef.current;
      stateRef.current = {
        ...current,
        defenders: [...current.defenders, defender],
      };
      syncState();
    },
    [syncState]
  );

  const removeFromCraft = useCallback((id: string) => {
    setLastDeployedId(id);
  }, []);

  const progress = xpProgress(renderState.xp, renderState.level);

  return (
    <GameContext.Provider
      value={{
        gameState: renderState,
        xpProgress: progress,
        startGame,
        resetGame,
        deployDefender,
        removeFromCraft,
        lastDeployedId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
