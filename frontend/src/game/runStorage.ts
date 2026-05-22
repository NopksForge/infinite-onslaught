const STORAGE_KEY = "io:run-history";

export type RunStats = {
  wave: number;
  xp: number;
  level: number;
  discoveries: number;
  endedAt: number;
};

export type RunHistory = {
  last: RunStats | null;
  best: RunStats | null;
};

function isRunStats(x: unknown): x is RunStats {
  if (x === null || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.wave === "number" &&
    typeof r.xp === "number" &&
    typeof r.level === "number" &&
    typeof r.discoveries === "number" &&
    typeof r.endedAt === "number"
  );
}

export function loadRunHistory(): RunHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { last: null, best: null };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return { last: null, best: null };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      last: isRunStats(obj.last) ? obj.last : null,
      best: isRunStats(obj.best) ? obj.best : null,
    };
  } catch {
    return { last: null, best: null };
  }
}

function isBetter(candidate: RunStats, current: RunStats | null): boolean {
  if (!current) return true;
  if (candidate.wave !== current.wave) return candidate.wave > current.wave;
  return candidate.xp > current.xp;
}

export function saveRun(stats: RunStats): RunHistory {
  const prev = loadRunHistory();
  const next: RunHistory = {
    last: stats,
    best: isBetter(stats, prev.best) ? stats : prev.best,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, quota) — best-effort only.
  }
  return next;
}
