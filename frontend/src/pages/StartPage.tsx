import { useCallback, useEffect, useState } from "react";
import { CheckOllama } from "../../wailsjs/go/main/App";
import { loadRunHistory, type RunStats } from "../game/runStorage";

type OllamaStatus = {
  ready: boolean;
  model: string;
  error?: string;
};

type Props = {
  onStart: () => void;
};

function hasBridge(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any)["go"]?.["main"]?.["App"];
}

async function pingOllama(): Promise<OllamaStatus> {
  try {
    if (hasBridge()) {
      return await CheckOllama();
    }
    // Fallback: Go HTTP server proxies the Ollama check for us (no CORS issue)
    const res = await fetch("http://localhost:8081/api/ollama-status");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { ready: false, model: "", error: String(e) };
  }
}

function RunStatLine({ label, run }: { label: string; run: RunStats }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-zinc-300">
        Wave <span className="font-semibold text-zinc-50">{run.wave}</span>
        <span className="px-1.5 text-zinc-600">·</span>
        Lv <span className="font-semibold text-zinc-50">{run.level}</span>
        <span className="px-1.5 text-zinc-600">·</span>
        <span className="font-semibold text-zinc-50">
          {run.xp.toLocaleString()}
        </span>{" "}
        XP
        <span className="px-1.5 text-zinc-600">·</span>
        <span className="font-semibold text-zinc-50">{run.discoveries}</span>{" "}
        found
      </span>
    </div>
  );
}

export function StartPage({ onStart }: Props) {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [history] = useState(() => loadRunHistory());

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await pingOllama());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-10 bg-zinc-950 px-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="mb-1 text-5xl font-black tracking-tight text-amber-400">
          Infinite Onslaught
        </h1>
        <p className="text-sm text-zinc-500">
          Craft. Discover. Defend.
        </p>
      </div>

      {/* Ollama status card */}
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900/80 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Ollama Status
          </span>
          <button
            type="button"
            onClick={() => void check()}
            disabled={checking}
            className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Recheck"}
          </button>
        </div>

        {checking && !status && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="animate-spin text-base">⟳</span>
            Connecting to Ollama…
          </div>
        )}

        {status && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.ready ? "bg-emerald-400" : "bg-red-500"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  status.ready ? "text-emerald-300" : "text-red-400"
                }`}
              >
                {status.ready ? "Ready" : "Not Available"}
              </span>
            </div>

            {status.ready && status.model && (
              <div className="rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2">
                <span className="text-[11px] text-zinc-500">Model</span>
                <p className="text-xs font-medium text-zinc-200">
                  {status.model}
                </p>
              </div>
            )}

            {!status.ready && status.error && (
              <p className="text-xs text-red-400/90">{status.error}</p>
            )}

            {!status.ready && (
              <p className="text-[11px] text-zinc-500">
                Make sure Ollama is running:{" "}
                <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">
                  ollama serve
                </code>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Run history */}
      {(history.last || history.best) && (
        <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900/80 p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Run History
          </div>
          <div className="flex flex-col gap-2">
            {history.best && <RunStatLine label="Best" run={history.best} />}
            {history.last && <RunStatLine label="Last" run={history.last} />}
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        type="button"
        onClick={onStart}
        disabled={!status?.ready}
        className="rounded-xl border border-amber-400/70 bg-amber-500/90 px-8 py-3 text-base font-bold text-zinc-950 shadow-lg transition hover:bg-amber-400 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
      >
        Start Game
      </button>

      <p className="text-[10px] text-zinc-600">
        Ollama must be running locally to power AI crafting.
      </p>
    </div>
  );
}
