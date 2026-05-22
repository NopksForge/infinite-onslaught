import { HUD } from "../components/HUD/HUD";
import { CraftingPanel } from "../components/Crafting/CraftingPanel";
import { Arena } from "../components/Arena/Arena";
import { GameProvider } from "../game/gameContext";
import { GameOverModal } from "../components/Modals/GameOverModal";
import { LevelUpModal } from "../components/Modals/LevelUpModal";
import { NewElementModal } from "../components/Modals/NewElementModal";
import { PauseModal } from "../components/Modals/PauseModal";

type GamePageProps = {
  onExit: () => void;
};

export function GamePage({ onExit }: GamePageProps) {
  return (
    <GameProvider onExit={onExit}>
      <div className="min-h-screen w-full bg-zinc-950 text-zinc-50 font-sans">
        <main className="mx-auto flex h-screen max-w-6xl flex-col gap-3 px-4 py-4">
          {/* HUD */}
          <section>
            <HUD />
          </section>

          {/* Main two-column layout */}
          <section className="flex min-h-0 flex-1 gap-3">
            <div className="flex min-h-0 w-[46%] flex-col rounded-lg border border-amber-400/60 bg-zinc-900/70 p-3 text-sm">
              <CraftingPanel />
            </div>

            <div className="flex min-h-0 w-[54%] flex-col rounded-lg border border-amber-400/60 bg-zinc-900/70 p-3 text-sm">
              <Arena />
            </div>
          </section>
        </main>
        <LevelUpModal />
        <NewElementModal />
        <PauseModal />
        <GameOverModal />
      </div>
    </GameProvider>
  );
}
