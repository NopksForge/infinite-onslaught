import { ResourceBar } from "../HUD/ResourceBar";
import { CombineBox } from "./CombineBox";
import { Inventory } from "./Inventory";

export function CraftTable() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 text-xs">
      <ResourceBar />

      <CombineBox />

      <div className="mt-1 flex min-h-0 flex-1 flex-col">
        <Inventory />
      </div>
    </section>
  );
}

