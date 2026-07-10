/**
 * localStorage persistence for daily results / streak / history /
 * practice log / achievement unlocks.
 *
 * Completed and in-progress dailies share one record shape. A daily is
 * complete when `completedAt` is set; partial progress keeps the same
 * puzzle entry with `rounds` shorter than the full set and `completedAt: null`.
 */

const KEY = "versemark:v2";
/**
 * Sliding window for daily history + practice log.
 * ~2000 rounds ≈ months of heavy practice; keeps stringify/localStorage
 * cheap on mobile while mastery is less jittery than a 400-round window.
 * Lifetime unlocks/counters never depend on this cap.
 */
const LOG_CAP = 2000;

/** Unified scored-round shape (daily verse or practice). */
export interface RoundRecord {
  trueRef: string;
  /** Range start on the global verse axis. */
  trueVerseIndex: number;
  /** Inclusive range end; equals trueVerseIndex for single verses. */
  trueRangeEndVerseIndex: number;
  guessVerseIndex: number;
  /** Scoring distance (to range start), as today. */
  distance: number;
  total: number;
  hintStep: number;
  /** ISO timestamp. */
  at: string;
  source: "daily" | "practice";
}

/** @deprecated Prefer RoundRecord — kept as alias for daily resume fields. */
export type DailyRoundRecord = RoundRecord;

export interface DailyResultRecord {
  puzzleNumber: number;
  dateKey: string; // YYYY-MM-DD local
  /** Last confirmed verse (or final verse when complete). */
  guessVerseIndex: number;
  trueVerseIndex: number;
  trueRef: string;
  distance: number;
  /** Sum of confirmed round totals so far. */
  total: number;
  hintStep: number;
  /** ISO timestamp when the full daily finished; null while in progress. */
  completedAt: string | null;
  rounds: RoundRecord[];
}

export interface AchievementUnlock {
  unlockedAt: string;
}

/**
 * Lifetime counters for power-user achievement ladders.
 * Never trimmed — unlocks evaluate from these, not the capped logs.
 */
export interface LifetimeCounters {
  /** Every confirmed daily or practice verse. */
  scoredRounds: number;
  exact: number;
  near: number;
  /** Exact with no hints (hintStep <= 1). */
  sight: number;
  sameChapter: number;
  /** Fully finished dailies (not capped by history window). */
  completedDailies: number;
  /** Completed dailies with all verses exact. */
  cleanSheets: number;
  /** Completed dailies with all verses hintStep <= 1. */
  noHintDailies: number;
}

export interface AppState {
  lastDaily: DailyResultRecord | null;
  history: DailyResultRecord[];
  streak: number;
  bestStreak: number;
  /** Lifetime practice finishes (install engagement + volume unlocks). */
  practiceRounds: number;
  /** Recent practice outcomes for mastery (sliding window; see LOG_CAP). */
  practiceLog: RoundRecord[];
  /** Lifetime placement tallies for scalable unlocks. */
  lifetime: LifetimeCounters;
  /** Stable unlock map; unknown ids preserved on load. */
  achievementUnlocks: Record<string, AchievementUnlock>;
  /** When the player last opened the achievements screen (crown dot). */
  achievementsSeenAt: string | null;
  /** ISO time the install banner was dismissed ("Not now"); null = never. */
  installDismissedAt: string | null;
}

export const emptyLifetime = (): LifetimeCounters => ({
  scoredRounds: 0,
  exact: 0,
  near: 0,
  sight: 0,
  sameChapter: 0,
  completedDailies: 0,
  cleanSheets: 0,
  noHintDailies: 0,
});

const defaultState = (): AppState => ({
  lastDaily: null,
  history: [],
  streak: 0,
  bestStreak: 0,
  practiceRounds: 0,
  practiceLog: [],
  lifetime: emptyLifetime(),
  achievementUnlocks: {},
  achievementsSeenAt: null,
  installDismissedAt: null,
});

/** True when the daily was fully finished (legacy rows always count as complete). */
export function isDailyComplete(record: DailyResultRecord): boolean {
  if (record.completedAt != null && record.completedAt !== "") return true;
  return false;
}

export function normalizeRoundRecord(
  raw: Partial<RoundRecord> | null | undefined,
  fallbackSource: "daily" | "practice" = "daily"
): RoundRecord | null {
  if (raw == null || typeof raw !== "object") return null;
  // Legacy daily rounds always had trueVerseIndex + distance
  if (raw.trueVerseIndex == null && raw.guessVerseIndex == null) return null;
  const trueVerseIndex = Number(raw.trueVerseIndex) || 0;
  const rangeEnd = Number(raw.trueRangeEndVerseIndex);
  return {
    trueRef: typeof raw.trueRef === "string" ? raw.trueRef : "",
    trueVerseIndex,
    trueRangeEndVerseIndex:
      Number.isFinite(rangeEnd) && rangeEnd > 0
        ? rangeEnd
        : trueVerseIndex,
    guessVerseIndex: Number(raw.guessVerseIndex) || 0,
    distance: Number(raw.distance) || 0,
    total: Number(raw.total) || 0,
    hintStep: Number(raw.hintStep) || 1,
    at:
      typeof raw.at === "string" && raw.at !== ""
        ? raw.at
        : new Date(0).toISOString(),
    source:
      raw.source === "practice" || raw.source === "daily"
        ? raw.source
        : fallbackSource,
  };
}

function normalizeRecord(
  raw: Partial<DailyResultRecord> | null | undefined
): DailyResultRecord | null {
  if (!raw || typeof raw.puzzleNumber !== "number") return null;
  const roundsRaw = Array.isArray(raw.rounds) ? raw.rounds : [];
  const rounds = roundsRaw
    .map((r) => normalizeRoundRecord(r as Partial<RoundRecord>, "daily"))
    .filter((r): r is RoundRecord => r != null);
  // Legacy rounds missing full fields: synthesize from top-level if empty but complete
  return {
    puzzleNumber: raw.puzzleNumber,
    dateKey: typeof raw.dateKey === "string" ? raw.dateKey : "",
    guessVerseIndex: Number(raw.guessVerseIndex) || 0,
    trueVerseIndex: Number(raw.trueVerseIndex) || 0,
    trueRef: typeof raw.trueRef === "string" ? raw.trueRef : "",
    distance: Number(raw.distance) || 0,
    total: Number(raw.total) || 0,
    hintStep: Number(raw.hintStep) || 1,
    completedAt:
      raw.completedAt == null || raw.completedAt === ""
        ? null
        : String(raw.completedAt),
    rounds,
  };
}

function normalizeUnlocks(
  raw: unknown
): Record<string, AchievementUnlock> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, AchievementUnlock> = {};
  for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!id) continue;
    if (val && typeof val === "object" && "unlockedAt" in val) {
      const at = String((val as AchievementUnlock).unlockedAt ?? "");
      if (at) out[id] = { unlockedAt: at };
    } else if (typeof val === "string" && val) {
      out[id] = { unlockedAt: val };
    }
  }
  return out;
}

function normalizeLifetime(raw: unknown): LifetimeCounters {
  const base = emptyLifetime();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<LifetimeCounters>;
  return {
    scoredRounds: Math.max(0, Number(o.scoredRounds) || 0),
    exact: Math.max(0, Number(o.exact) || 0),
    near: Math.max(0, Number(o.near) || 0),
    sight: Math.max(0, Number(o.sight) || 0),
    sameChapter: Math.max(0, Number(o.sameChapter) || 0),
    completedDailies: Math.max(0, Number(o.completedDailies) || 0),
    cleanSheets: Math.max(0, Number(o.cleanSheets) || 0),
    noHintDailies: Math.max(0, Number(o.noHintDailies) || 0),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const history = Array.isArray(parsed.history)
      ? parsed.history
          .map((h) => normalizeRecord(h))
          .filter((h): h is DailyResultRecord => h != null)
      : [];
    const practiceLog = Array.isArray(parsed.practiceLog)
      ? parsed.practiceLog
          .map((r) => normalizeRoundRecord(r, "practice"))
          .filter((r): r is RoundRecord => r != null)
      : [];
    return {
      lastDaily: normalizeRecord(parsed.lastDaily),
      history,
      streak: Number(parsed.streak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      practiceRounds: Math.max(0, Number(parsed.practiceRounds) || 0),
      practiceLog,
      lifetime: normalizeLifetime(parsed.lifetime),
      achievementUnlocks: normalizeUnlocks(parsed.achievementUnlocks),
      achievementsSeenAt:
        typeof parsed.achievementsSeenAt === "string" &&
        parsed.achievementsSeenAt !== ""
          ? parsed.achievementsSeenAt
          : null,
      installDismissedAt:
        typeof parsed.installDismissedAt === "string" &&
        parsed.installDismissedAt !== ""
          ? parsed.installDismissedAt
          : null,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — ignore
  }
}

function dateKeyFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function localDateKey(now: Date = new Date()): string {
  return dateKeyFromParts(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
}

/** Consecutive completed calendar days ending at today (or yesterday if today open). */
export function computeStreak(
  history: DailyResultRecord[],
  todayKey: string
): number {
  const completed = history.filter(isDailyComplete);
  if (!completed.length) return 0;
  const keys = new Set(completed.map((h) => h.dateKey));
  let streak = 0;
  let cursor = parseDateKey(todayKey);
  if (!keys.has(todayKey)) {
    cursor = addDays(cursor, -1);
  }
  while (keys.has(dateKeyFromParts(cursor.y, cursor.m, cursor.d))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function parseDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function addDays(
  p: { y: number; m: number; d: number },
  delta: number
): { y: number; m: number; d: number } {
  const dt = new Date(p.y, p.m - 1, p.d + delta);
  return {
    y: dt.getFullYear(),
    m: dt.getMonth() + 1,
    d: dt.getDate(),
  };
}

/**
 * Upsert daily progress (partial or complete). Streak only counts completed dailies.
 */
export function recordDailyResult(
  record: DailyResultRecord,
  now: Date = new Date()
): AppState {
  const state = loadState();
  const filtered = state.history.filter(
    (h) => h.puzzleNumber !== record.puzzleNumber
  );
  filtered.push(record);
  filtered.sort((a, b) => a.puzzleNumber - b.puzzleNumber);
  const history = filtered.slice(-LOG_CAP);
  const streak = computeStreak(history, localDateKey(now));
  const next: AppState = {
    ...state,
    lastDaily: record,
    history,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
  saveState(next);
  return next;
}

export function getDailyForPuzzle(
  puzzleNumber: number
): DailyResultRecord | null {
  const state = loadState();
  return (
    state.history.find((h) => h.puzzleNumber === puzzleNumber) ??
    (state.lastDaily?.puzzleNumber === puzzleNumber ? state.lastDaily : null)
  );
}

/** How many fully finished dailies are in history. */
export function completedDailyCount(state: AppState = loadState()): number {
  return state.history.filter(isDailyComplete).length;
}

/**
 * Apply one scored round to lifetime counters (power-user ladders).
 * Call after effectiveDistance is known for the finished round.
 */
export function bumpLifetimeForRound(
  state: AppState,
  flags: {
    exact: boolean;
    near: boolean;
    sight: boolean;
    sameChapter: boolean;
  }
): LifetimeCounters {
  const L = { ...state.lifetime };
  L.scoredRounds += 1;
  if (flags.exact) {
    L.exact += 1;
    if (flags.sight) L.sight += 1;
  } else if (flags.near) {
    L.near += 1;
  }
  if (flags.sameChapter) L.sameChapter += 1;
  return L;
}

/** Append a practice outcome and bump lifetime practice counter. */
export function recordPracticeResult(
  record: RoundRecord,
  lifetimeFlags?: {
    exact: boolean;
    near: boolean;
    sight: boolean;
    sameChapter: boolean;
  }
): AppState {
  const state = loadState();
  const practiceLog = [...state.practiceLog, record].slice(-LOG_CAP);
  const lifetime = lifetimeFlags
    ? bumpLifetimeForRound(state, lifetimeFlags)
    : {
        ...state.lifetime,
        scoredRounds: state.lifetime.scoredRounds + 1,
      };
  const next: AppState = {
    ...state,
    practiceRounds: state.practiceRounds + 1,
    practiceLog,
    lifetime,
  };
  saveState(next);
  return next;
}

/** Replace or patch lifetime counters (e.g. after bump + clean-sheet). */
export function updateLifetime(
  patch: Partial<LifetimeCounters>
): AppState {
  const state = loadState();
  const lifetime = emptyLifetime();
  const merged = { ...state.lifetime, ...patch };
  for (const key of Object.keys(lifetime) as (keyof LifetimeCounters)[]) {
    lifetime[key] = Math.max(0, Number(merged[key]) || 0);
  }
  const next: AppState = { ...state, lifetime };
  saveState(next);
  return next;
}

/** @deprecated Prefer recordPracticeResult — counter-only for tests. */
export function recordPracticeRound(): AppState {
  const state = loadState();
  const next: AppState = {
    ...state,
    practiceRounds: state.practiceRounds + 1,
  };
  saveState(next);
  return next;
}

/** Merge unlocks; never revokes existing. Returns newly unlocked ids. */
export function mergeAchievementUnlocks(
  unlocks: Record<string, AchievementUnlock>,
  now: Date = new Date()
): { state: AppState; newlyUnlocked: string[] } {
  const state = loadState();
  const newlyUnlocked: string[] = [];
  const at = now.toISOString();
  const nextMap = { ...state.achievementUnlocks };
  for (const [id, info] of Object.entries(unlocks)) {
    if (!id) continue;
    if (!nextMap[id]) {
      nextMap[id] = { unlockedAt: info.unlockedAt || at };
      newlyUnlocked.push(id);
    }
  }
  if (!newlyUnlocked.length) return { state, newlyUnlocked };
  const next: AppState = { ...state, achievementUnlocks: nextMap };
  saveState(next);
  return { state: next, newlyUnlocked };
}

export function markAchievementsSeen(now: Date = new Date()): AppState {
  const state = loadState();
  const next: AppState = {
    ...state,
    achievementsSeenAt: now.toISOString(),
  };
  saveState(next);
  return next;
}

/** Unseen unlocks since last visit to the achievements screen. */
export function unseenAchievementCount(state: AppState = loadState()): number {
  const seen = state.achievementsSeenAt
    ? Date.parse(state.achievementsSeenAt)
    : 0;
  let n = 0;
  for (const u of Object.values(state.achievementUnlocks)) {
    const t = Date.parse(u.unlockedAt);
    if (Number.isFinite(t) && t > (Number.isFinite(seen) ? seen : 0)) n++;
  }
  // If never opened, all unlocks count as unseen
  if (!state.achievementsSeenAt) {
    return Object.keys(state.achievementUnlocks).length;
  }
  return n;
}

/** Snooze the install offer (also used after a successful install). */
export function dismissInstallOffer(now: Date = new Date()): AppState {
  const state = loadState();
  const next: AppState = {
    ...state,
    installDismissedAt: now.toISOString(),
  };
  saveState(next);
  return next;
}

/* ———— Translation preference (verse text only) ———— */

export type TranslationId = "kjv" | "bsb";

const TRANSLATION_KEY = "versemark:translation";

/** Default BSB; KJV is the alternate public-domain text. */
export function loadTranslation(): TranslationId {
  try {
    const raw = localStorage.getItem(TRANSLATION_KEY);
    if (raw === "bsb" || raw === "kjv") return raw;
  } catch {
    // private mode
  }
  return "bsb";
}

export function saveTranslation(id: TranslationId): void {
  try {
    localStorage.setItem(TRANSLATION_KEY, id);
  } catch {
    // ignore
  }
}
