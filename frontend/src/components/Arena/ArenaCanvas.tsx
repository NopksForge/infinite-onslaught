import { useRef, useState, type DragEvent } from "react";
import { useGame } from "../../game/gameContext";
import type { DeployableItem } from "../../game/types";

const DEFENDER_BORDER: Record<string, string> = {
  alive_melee: "border-amber-400 shadow-amber-900/50",
  alive_range: "border-blue-400 shadow-blue-900/50",
  spell: "border-purple-400 shadow-purple-900/50",
  obstacle: "border-green-400 shadow-green-900/50",
};

export function ArenaCanvas() {
  const { gameState, startGame, resetGame, deployDefender, removeFromCraft } = useGame();
  const { status, wave, waveTimer, defenders, monsters, spawnQueue } = gameState;
  const arenaRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

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
    deployDefender(item, clampedX, clampedY);
    if (item.craftingId) removeFromCraft(item.craftingId);
    if (status === "idle") startGame();
  };

  const monstersIncoming = spawnQueue.length + monsters.length;

  return (
    <div
      ref={arenaRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex-1 overflow-hidden rounded-md border transition-colors ${
        dragOver
          ? "border-amber-400 bg-amber-900/10"
          : "border-dashed border-zinc-700 bg-linear-to-b from-zinc-900 via-zinc-950 to-zinc-900"
      }`}
      style={{ minHeight: 280 }}
    >
      {/* Drag-over hint */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-lg bg-amber-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200">
            Drop to deploy defender
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

      {/* Game over overlay */}
      {status === "game_over" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/80">
          <div className="text-lg font-bold text-red-400">Base Destroyed</div>
          <div className="text-xs text-zinc-400">Wave {wave} reached</div>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-lg border border-red-400/60 bg-red-900/40 px-4 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-800/50"
          >
            Restart
          </button>
        </div>
      )}

      {/* Wave info */}
      {status === "active" && (
        <div className="absolute left-1 top-1 z-10 flex gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded bg-zinc-900/80 px-1.5 py-0.5">
            Wave {wave === 0 ? 1 : wave}
          </span>
          {waveTimer > 0 && monstersIncoming === 0 && (
            <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 text-amber-300">
              Next in {Math.ceil(waveTimer)}s
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
        return (
          <div
            key={d.id}
            className={`absolute flex flex-col items-center select-none`}
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
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
            <div
              className={`rounded-lg border-2 bg-zinc-900/90 px-1 py-0.5 text-center shadow-md ${borderClass}`}
              style={{ minWidth: 28 }}
            >
              <div className="text-base leading-none">{d.emoji}</div>
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
        return (
          <div
            key={m.id}
            className="absolute flex flex-col items-center select-none"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 4,
            }}
          >
            <div className="rounded bg-zinc-950/80 px-1 py-0.5 text-center">
              <div className="text-base leading-none">{m.emoji}</div>
              <div className="mt-0.5 h-1 w-6 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

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
