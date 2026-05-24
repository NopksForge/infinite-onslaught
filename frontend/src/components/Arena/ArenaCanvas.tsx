import { useEffect, useRef, useState, type DragEvent } from "react";
import { useGame } from "../../game/gameContext";
import type { DeployableItem } from "../../game/types";

const DEFENDER_BORDER: Record<string, string> = {
  alive_melee: "border-amber-400 shadow-amber-900/50",
  alive_range: "border-blue-400 shadow-blue-900/50",
  spell: "border-purple-400 shadow-purple-900/50",
  obstacle: "border-green-400 shadow-green-900/50",
};

export function ArenaCanvas() {
  const { gameState, startGame, deployDefender, removeFromCraft } = useGame();
  const {
    status,
    wave,
    waveTimer,
    defenders,
    monsters,
    projectiles,
    spawnQueue,
    baseShake,
  } = gameState;
  const arenaRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [denyFlash, setDenyFlash] = useState(false);
  const denyTimerRef = useRef<number | null>(null);

  // Clean up the deny-flash timer on unmount.
  useEffect(() => () => {
    if (denyTimerRef.current !== null) clearTimeout(denyTimerRef.current);
  }, []);

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("application/defender-json")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    }
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData("application/defender-json");
    if (!raw) return;
    let item: DeployableItem;
    try {
      item = JSON.parse(raw) as DeployableItem;
    } catch {
      return;
    }
    const el = arenaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const arenaX = ((e.clientX - rect.left) / rect.width) * 100;
    const arenaY = ((e.clientY - rect.top) / rect.height) * 100;
    // Clamp to playable area (not the base zone)
    const clampedX = Math.max(2, Math.min(98, arenaX));
    const clampedY = Math.max(2, Math.min(85, arenaY));
    const deployed = deployDefender(item, clampedX, clampedY);
    if (!deployed) {
      // Likely insufficient mana — flash the arena red and keep the item.
      setDenyFlash(true);
      if (denyTimerRef.current !== null) clearTimeout(denyTimerRef.current);
      denyTimerRef.current = window.setTimeout(() => setDenyFlash(false), 350);
      return;
    }
    if (item.craftingId) removeFromCraft(item.craftingId);
    if (status === "idle") startGame();
  };

  const monstersIncoming = spawnQueue.length + monsters.length;

  // Apply screen shake: a few px offset, decays with baseShake remaining.
  const shakeIntensity = Math.min(1, baseShake / 0.35);
  const shakeStyle = shakeIntensity > 0
    ? {
        transform: `translate(${(Math.random() - 0.5) * 6 * shakeIntensity}px, ${
          (Math.random() - 0.5) * 6 * shakeIntensity
        }px)`,
      }
    : undefined;

  return (
    <div
      ref={arenaRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex-1 overflow-hidden rounded-md border transition-colors ${
        denyFlash
          ? "border-red-500 bg-red-900/20"
          : dragOver
          ? "border-amber-400 bg-amber-900/10"
          : "border-dashed border-zinc-700 bg-linear-to-b from-zinc-900 via-zinc-950 to-zinc-900"
      }`}
      style={{ minHeight: 280, ...shakeStyle }}
    >
      {/* Drag-over hint */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-lg bg-amber-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200">
            Drop to deploy defender
          </span>
        </div>
      )}

      {/* Deny flash (no mana) */}
      {denyFlash && !dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-lg bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-red-200">
            Not enough mana
          </span>
        </div>
      )}

      {/* Idle overlay */}
      {status === "idle" && !dragOver && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <div className="text-center text-xs text-zinc-400">
            <div className="mb-1 text-2xl">⚔️</div>
            Drag a crafted item here to deploy it,
            <br />
            or click Start to begin the onslaught.
          </div>
          <button
            type="button"
            onClick={startGame}
            className="rounded-lg border border-amber-400/60 bg-amber-900/40 px-4 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-800/50"
          >
            Start
          </button>
        </div>
      )}

      {/* Wave info */}
      {status === "active" && (
        <div className="absolute left-1 top-1 z-10 flex gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded bg-zinc-900/80 px-1.5 py-0.5">
            Wave {wave === 0 ? 1 : wave}
          </span>
          {wave > 0 && wave % 5 === 0 && monstersIncoming > 0 && (
            <span className="rounded bg-red-900/80 px-1.5 py-0.5 font-semibold text-red-200">
              BOSS WAVE
            </span>
          )}
          {waveTimer > 0 && monstersIncoming === 0 && (
            <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 text-amber-300">
              Next in {Math.ceil(waveTimer)}s
              {(wave + 1) % 5 === 0 && " · ⚠ boss"}
            </span>
          )}
          {monstersIncoming > 0 && (
            <span className="rounded bg-red-900/60 px-1.5 py-0.5 text-red-300">
              {monstersIncoming} incoming
            </span>
          )}
        </div>
      )}

      {/* Spawn zone label */}
      {status === "active" && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 border-b border-dashed border-zinc-800 py-0.5 text-center text-[9px] text-zinc-700">
          ↓ spawn
        </div>
      )}

      {/* Defenders */}
      {defenders.map((d) => {
        const borderClass =
          DEFENDER_BORDER[d.type] ?? "border-zinc-500";
        const hpPct = Math.max(0, (d.hp / d.maxHp) * 100);
        const lifePct = Math.max(0, (d.lifetime / 45) * 100); // rough visual
        const flashOpacity = d.hitFlash > 0 ? Math.min(1, d.hitFlash / 0.15) * 0.7 : 0;
        const fadeOpacity = d.dying > 0 ? Math.max(0, d.dying / 0.35) : 1;
        return (
          <div
            key={d.id}
            className={`absolute flex flex-col items-center select-none transition-opacity`}
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
              opacity: fadeOpacity,
            }}
          >
            {/* Spell radius visual */}
            {d.type === "spell" && !d.spellApplied && (
              <div
                className="absolute rounded-full border border-purple-400/40 bg-purple-900/20"
                style={{
                  width: `${d.spellArea * 2}%`,
                  height: `${d.spellArea * 2}%`,
                  transform: "translate(-50%, -50%)",
                  top: "50%",
                  left: "50%",
                }}
              />
            )}
            {/* Range indicator for range attackers */}
            {d.type === "alive_range" && (
              <div
                className="pointer-events-none absolute rounded-full border border-blue-400/15"
                style={{
                  width: `${d.attackRange * 2}%`,
                  height: `${d.attackRange * 2}%`,
                  transform: "translate(-50%, -50%)",
                  top: "50%",
                  left: "50%",
                }}
              />
            )}
            {/* Melee attack radius (light tint) */}
            {d.type === "alive_melee" && (
              <div
                className="pointer-events-none absolute rounded-full border border-amber-400/10"
                style={{
                  width: `${d.attackRange * 2}%`,
                  height: `${d.attackRange * 2}%`,
                  transform: "translate(-50%, -50%)",
                  top: "50%",
                  left: "50%",
                }}
              />
            )}
            <div
              className={`relative rounded-lg border-2 bg-zinc-900/90 px-1 py-0.5 text-center shadow-md ${borderClass}`}
              style={{ minWidth: 28 }}
            >
              <div className="text-base leading-none">{d.emoji}</div>
              {/* Hit flash overlay */}
              {flashOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg bg-white"
                  style={{ opacity: flashOpacity }}
                />
              )}
              {/* HP bar */}
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              {/* Lifetime bar */}
              <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-400/60 transition-all"
                  style={{ width: `${lifePct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Monsters */}
      {monsters.map((m) => {
        const hpPct = Math.max(0, (m.hp / m.maxHp) * 100);
        const flashOpacity = m.hitFlash > 0 ? Math.min(1, m.hitFlash / 0.15) * 0.8 : 0;
        const fadeOpacity = m.dying > 0 ? Math.max(0, m.dying / 0.35) : 1;
        const dyingScale = m.dying > 0 ? 1 + (1 - m.dying / 0.35) * 0.4 : 1;
        const flyingBob = m.behavior === "flying"
          ? Math.sin(m.age * 4) * 0.6
          : 0;
        const bossClass = m.isBoss
          ? "ring-2 ring-red-500/70 shadow-lg shadow-red-900/50"
          : "";
        return (
          <div
            key={m.id}
            className="absolute flex flex-col items-center select-none transition-opacity"
            style={{
              left: `${m.x}%`,
              top: `${m.y + flyingBob}%`,
              transform: `translate(-50%, -50%) scale(${dyingScale})`,
              zIndex: m.isBoss ? 6 : m.behavior === "flying" ? 5 : 4,
              opacity: fadeOpacity,
            }}
          >
            {/* Flying shadow */}
            {m.behavior === "flying" && m.dying === 0 && (
              <div
                className="absolute rounded-full bg-black/40 blur-[1px]"
                style={{
                  width: m.isBoss ? 30 : 16,
                  height: 4,
                  top: m.isBoss ? 32 : 22,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              />
            )}
            <div
              className={`relative rounded bg-zinc-950/80 px-1 py-0.5 text-center ${bossClass}`}
              style={m.isBoss ? { padding: "0.25rem 0.5rem" } : undefined}
            >
              <div
                className="leading-none"
                style={{ fontSize: m.isBoss ? "1.75rem" : undefined }}
              >
                {m.emoji}
              </div>
              {/* Hit flash overlay */}
              {flashOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-0 rounded bg-white"
                  style={{ opacity: flashOpacity }}
                />
              )}
              <div
                className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-800"
                style={{ width: m.isBoss ? 48 : 24 }}
              >
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              {/* Boss name tag */}
              {m.isBoss && m.dying === 0 && (
                <div className="mt-0.5 whitespace-nowrap text-[8px] font-semibold uppercase tracking-wide text-red-300">
                  {m.name}
                </div>
              )}
              {/* Behavior icon for variants (non-boss) */}
              {!m.isBoss && m.dying === 0 && m.behavior !== "straight" && (
                <div className="absolute -right-1 -top-1 rounded-full bg-zinc-900/90 px-1 text-[8px] leading-tight">
                  {m.behavior === "zigzag" ? "↯" : "✈"}
                </div>
              )}
            </div>
            {/* Death particles */}
            {m.dying > 0 && (
              <div className="pointer-events-none absolute inset-0">
                {[0, 1, 2, 3].map((i) => {
                  const angle = (i / 4) * Math.PI * 2;
                  const dist = (1 - m.dying / 0.35) * 14;
                  return (
                    <span
                      key={i}
                      className="absolute text-[10px]"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`,
                        opacity: fadeOpacity,
                      }}
                    >
                      ✦
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Projectiles */}
      {projectiles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.9)]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 6,
          }}
        />
      ))}

      {/* Player base zone */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-amber-900/60 bg-amber-950/20 py-1 text-center text-[9px] font-semibold text-amber-700/80">
        BASE
      </div>

      {/* Empty hint when active with no defenders */}
      {status === "active" && defenders.length === 0 && !dragOver && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] text-zinc-600">
          Drag crafted items here to deploy defenders
        </div>
      )}
    </div>
  );
}
