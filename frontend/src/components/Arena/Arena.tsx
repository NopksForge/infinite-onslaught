import { useGame } from "../../game/gameContext";
import { ArenaCanvas } from "./ArenaCanvas";
import { PlayerBase } from "./PlayerBase";

export function Arena() {
  const { gameState } = useGame();
  const { wave, status } = gameState;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Arena
          </div>
          {status === "active" && wave > 0 && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
              Wave {wave}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">
            Drag crafted items to deploy defenders
          </span>
          <PlayerBase />
        </div>
      </div>

      <ArenaCanvas />
    </section>
  );
}
