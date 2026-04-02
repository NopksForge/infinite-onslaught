import { HUD } from "./components/HUD/HUD";
import { CraftTable } from "./components/CraftTable/CraftTable";
import { Arena } from "./components/Arena/Arena";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-50 font-sans">
      <main className="mx-auto flex h-screen max-w-6xl flex-col gap-3 px-4 py-4">
        {/* HUD */}
        <section>
          <HUD />
        </section>

        {/* Main two-column layout */}
        <section className="flex min-h-0 flex-1 gap-3">
          {/* Craft table (40%) */}
          <div className="flex min-h-0 w-[40%] flex-col rounded-lg border border-amber-400/60 bg-zinc-900/70 p-3 text-sm">
            <CraftTable />
          </div>

          {/* Arena (60%) */}
          <div className="flex min-h-0 w-[60%] flex-col rounded-lg border border-amber-400/60 bg-zinc-900/70 p-3 text-sm">
            <Arena />
          </div>
        </section>
      </main>
    </div>
  );
}