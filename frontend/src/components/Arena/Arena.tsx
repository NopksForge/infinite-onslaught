import { ArenaCanvas } from "./ArenaCanvas";
import { PlayerBase } from "./PlayerBase";

export function Arena() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
          Arena
        </div>
        <PlayerBase />
      </div>

      <ArenaCanvas />
    </section>
  );
}
