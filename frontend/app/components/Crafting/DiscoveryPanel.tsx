"use client";

import { useMemo, useState } from "react";

import type { DiscoveryItem } from "./types";

type DiscoveryPanelProps = {
  discoveries: DiscoveryItem[];
};

function discoveryMatchesQuery(item: DiscoveryItem, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.description.toLowerCase().includes(q)) return true;
  for (const pair of item.created_from ?? []) {
    for (const part of pair) {
      if (part.toLowerCase().includes(q)) return true;
    }
  }
  return false;
}

function CreatedFromInline({ item }: { item: DiscoveryItem }) {
  const pairs = item.created_from ?? [];
  const hasPairs = pairs.length > 0;

  return (
    <div className="flex w-full flex-col gap-1.5 text-left text-[10px] leading-snug text-zinc-200">
      <div className="font-semibold uppercase tracking-wide text-emerald-200/90">
        Created from
      </div>
      {hasPairs ? (
        <ul className="list-none space-y-1">
          {pairs.map((pair, j) => (
            <li key={j} className="text-zinc-300">
              {pair.join(" + ")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">No combination history recorded.</p>
      )}
    </div>
  );
}

export function DiscoveryPanel({ discoveries }: DiscoveryPanelProps) {
  const [query, setQuery] = useState("");
  const empty = discoveries.length === 0;

  const filtered = useMemo(
    () => discoveries.filter((d) => discoveryMatchesQuery(d, query)),
    [discoveries, query]
  );

  const countLabel = empty
    ? "No items yet"
    : query.trim()
      ? `${filtered.length} / ${discoveries.length}`
      : `${discoveries.length} found`;

  return (
    <div className="shrink-0 rounded-lg border border-emerald-900/60 bg-zinc-900/80 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          Discovery
        </div>
        <div className="text-[10px] text-zinc-500">{countLabel}</div>
      </div>
      <p className="mb-2 text-[10px] text-zinc-500">
        Hover a card to see which ingredient pairs created it.
      </p>
      {!empty && (
        <label className="mb-3 block">
          <span className="sr-only">Search discoveries</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description, or ingredients…"
            autoComplete="off"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950/80 px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-600/60 focus:ring-1 focus:ring-emerald-600/40"
          />
        </label>
      )}
      {empty ? (
        <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-950/50 px-3 py-6 text-center text-[11px] text-zinc-600">
          Combine resources on the canvas to discover something new.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-950/50 px-3 py-6 text-center text-[11px] text-zinc-500">
          No discoveries match your search.
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {filtered.map((d, i) => (
              <div
                key={`${d.name}-${d.emoji}-${i}`}
                className="group flex min-h-[5.5rem] flex-col justify-center rounded-xl border border-emerald-800/50 bg-zinc-950/70 px-3 py-3 text-center transition-colors hover:border-emerald-500/40 hover:bg-zinc-900/80"
              >
                <div className="flex flex-col items-center gap-2 group-hover:hidden">
                  <span className="text-3xl leading-none select-none">
                    {d.emoji}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium text-zinc-100">
                    {d.name}
                  </span>
                </div>
                <div className="hidden group-hover:flex">
                  <CreatedFromInline item={d} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
