import { useEffect, useState } from "react";
import {
  getUnlockables,
  unlockElement,
} from "../../components/Crafting/craftApi";
import { useGame } from "../../game/gameContext";
import type { ResourceItem } from "../Crafting/types";

const MAX_CHOICES = 3;

/** Picks up to `n` random distinct items from `pool` without mutating it. */
function sample<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function NewElementModal() {
  const { activeModal, applyNewElement } = useGame();
  const [choices, setChoices] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = activeModal === "new_element";

  // Fetch fresh unlockables each time the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const pool = await getUnlockables();
      if (cancelled) return;
      setChoices(sample(pool, MAX_CHOICES));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handlePick = async (name: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await unlockElement(name);
    setSubmitting(false);
    if (!result) {
      setError("Failed to unlock that element. Try another.");
      return;
    }
    applyNewElement(name);
  };

  // Nothing left to unlock — let the player dismiss and continue.
  const allUnlocked = !loading && choices.length === 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-sky-400/70 bg-zinc-950 p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-sky-200">
          New Element Unlocked
        </h2>
        <p className="mb-3 text-xs text-zinc-300">
          Add a new element to your resource pool. Persists across runs.
        </p>

        {loading && (
          <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-6 text-center text-[11px] text-zinc-500">
            Loading…
          </div>
        )}

        {allUnlocked && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-6 text-center text-[11px] text-zinc-400">
            You've discovered every starter element. Nothing left to unlock!
            <button
              type="button"
              onClick={() => applyNewElement("")}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              Continue
            </button>
          </div>
        )}

        {!loading && choices.length > 0 && (
          <div className="grid gap-2 text-xs md:grid-cols-3">
            {choices.map((opt) => (
              <button
                key={opt.name}
                type="button"
                disabled={submitting}
                onClick={() => void handlePick(opt.name)}
                className="flex flex-col items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-3 text-center transition hover:border-sky-400/70 hover:bg-zinc-900 disabled:cursor-progress disabled:opacity-50"
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className="text-[11px] font-semibold text-zinc-50">
                  {opt.name}
                </span>
                <span className="line-clamp-3 text-[10px] text-zinc-400">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 text-[11px] text-red-400/90">{error}</p>
        )}
      </div>
    </div>
  );
}
