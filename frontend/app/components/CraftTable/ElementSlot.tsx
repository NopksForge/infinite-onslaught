type ElementSlotProps = {
  label: string;
  emoji: string;
};

export function ElementSlot({ label, emoji }: ElementSlotProps) {
  return (
    <div className="flex h-16 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-700 bg-zinc-900/70 text-[11px] text-zinc-200">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="truncate px-1">{label}</span>
    </div>
  );
}

