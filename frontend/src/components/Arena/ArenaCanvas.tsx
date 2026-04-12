export function ArenaCanvas() {
  return (
    <div className="flex h-full flex-1 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-linear-to-br from-zinc-900 via-zinc-950 to-zinc-900">
      <div className="text-center text-xs text-zinc-400">
        Arena canvas placeholder
        <div className="mt-1 text-[11px] text-zinc-500">
          Monsters, defenders, and projectiles will appear here.
        </div>
      </div>
    </div>
  );
}
