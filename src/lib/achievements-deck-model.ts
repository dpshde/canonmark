/**
 * Pure view-model for the achievements snap deck.
 * Driven only by live AppState via mastery / achievements / storage.
 */
import { bookSegments } from "./axis";
import {
  listAchievements,
  nextClosestAchievement,
  type AchievementMetal,
  type AchievementView,
} from "./achievements";
import {
  buildOverallStats,
  type OverallStats,
} from "./achievements-stats";
import { BOOKS } from "./books";
import {
  computeMastery,
  formatMiss,
  masteryHeatColor,
  type MasteryReport,
} from "./mastery";
import type { AppState } from "./storage";

export type DeckCardId =
  | "you"
  | "map"
  | "far"
  | "close"
  | "next"
  | "marks-path"
  | "train"
  | "index";

export type SheetId =
  | "stats"
  | "books"
  | "marks"
  | "marks-all"
  | "earned"
  | "genres";

export interface YouCardModel {
  headline: string;
  heroValue: string;
  heroUnit: string;
  chips: { label: string; value: string }[];
  stageLabel: string;
  empty: boolean;
}

export interface MapSegmentModel {
  osis: string;
  name: string;
  t0: number;
  t1: number;
  heat: string | null;
  /** Median miss when tested; null when untested (for theme recolor). */
  medianDistance: number | null;
  metric: string;
  rounds: number;
}

export interface MapCardModel {
  segments: MapSegmentModel[];
  measuredCount: number;
}

export interface BookPickRow {
  osis: string;
  name: string;
  metric: string;
  heat: string;
  rounds: number;
  medianDistance: number;
}

export interface BookPickModel {
  rows: BookPickRow[];
  sheetFilter: "far" | "close";
}

export interface NextMarkModel {
  id: string;
  title: string;
  description: string;
  current: number;
  threshold: number;
  progress: number;
  dropCap: string;
  metal: AchievementMetal;
  ladder?: string;
}

export type TrailNodeStatus = "passed" | "now" | "ahead";

export interface TrailNode {
  id: string;
  title: string;
  description: string;
  threshold: number;
  current: number;
  progress: number;
  status: TrailNodeStatus;
  dropCap: string;
  metal: AchievementMetal;
}

export interface MarksPathEntry {
  key: string;
  label: string;
  nodes: TrailNode[];
  /** Full ladder materialization for sheets (same listAchievements filter). */
  fullLadder: AchievementView[];
}

export interface MarksPathModel {
  paths: MarksPathEntry[];
}

export interface TrainCardModel {
  primaryLabel: string;
  secondaryLabel: string;
  primaryAction: "practice" | "practice-book";
  bookOsis?: string;
  bookName?: string;
}

export interface IndexStoryRow {
  cardId: DeckCardId;
  n: string;
  title: string;
  meta: string;
}

export interface IndexSheetRow {
  sheetId: SheetId;
  title: string;
  meta: string;
  filter?: string;
  pathKey?: string;
}

export interface IndexModel {
  story: IndexStoryRow[];
  fullData: IndexSheetRow[];
}

export interface DeckModel {
  empty: boolean;
  cards: DeckCardId[];
  you: YouCardModel;
  map: MapCardModel;
  far: BookPickModel;
  close: BookPickModel;
  next: NextMarkModel | null;
  marksPath: MarksPathModel;
  train: TrainCardModel;
  index: IndexModel;
  overall: OverallStats;
  unlocks: AchievementView[];
}

/** UI labels for primary deck path tabs (sight → Unaided). */
export const PRIMARY_PATH_LABELS: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: "sight", label: "Unaided" },
  { key: "exact", label: "Exact" },
  { key: "daily", label: "Show up" },
] as const;

/** All ladder keys for marks-all sheet (Unaided first for sight). */
export const ALL_LADDER_LABELS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "sight", label: "Unaided" },
  { key: "exact", label: "Exact" },
  { key: "near", label: "Near" },
  { key: "chapter", label: "Chapter" },
  { key: "rounds", label: "Rounds" },
  { key: "streak", label: "Streak" },
  { key: "daily", label: "Daily" },
  { key: "clean", label: "Clean" },
  { key: "unprompted", label: "Unprompted" },
] as const;

/**
 * Stage from rounds + coverage. Thresholds fixed for tests.
 * new: 0 · warming: 1–9 · finding: 10–49 · settled: 50–199 · deep: 200+
 */
export function stageFromProgress(
  rounds: number,
  booksTested: number
): string {
  if (rounds <= 0) return "New";
  if (rounds < 10) return "Warming";
  if (rounds < 50) return booksTested >= 12 ? "Mapping" : "Finding";
  if (rounds < 200) return "Settled";
  return "Deep";
}

/**
 * Short claim from rates — templates only, no LLM.
 */
export function pulseHeadline(input: {
  rounds: number;
  exactRate: number | null;
  chapterShare: number | null;
  booksTested: number;
}): string {
  if (input.rounds <= 0) {
    return "Your ledger starts with one mark.";
  }
  const er = input.exactRate;
  const books = input.booksTested;
  if (er != null && er >= 0.35) {
    return "You're landing exacts more often than most.";
  }
  if (er != null && er < 0.08 && books >= 8) {
    return "Books: getting it. Verses: still rare.";
  }
  if (books >= 20) {
    return "Canon map is filling in — keep the miss down.";
  }
  if (books >= 5) {
    return "A few books known. The rest is still gray.";
  }
  return "Every round tightens the map.";
}

function exactRateNumber(mastery: MasteryReport): number | null {
  if (mastery.totalRounds <= 0) return null;
  return mastery.exactCount / mastery.totalRounds;
}

function buildYou(state: AppState, mastery: MasteryReport): YouCardModel {
  const overall = buildOverallStats(state);
  const empty = mastery.totalRounds === 0;
  const er = exactRateNumber(mastery);
  const booksTested = Object.keys(mastery.bookHeat).length;
  const headline = pulseHeadline({
    rounds: mastery.totalRounds,
    exactRate: er,
    chapterShare: null,
    booksTested,
  });
  return {
    headline: empty
      ? "Finish a daily or practice round to start your ledger."
      : headline,
    heroValue: empty ? "—" : overall.exactRate === "—" ? "0%" : overall.exactRate,
    heroUnit: empty
      ? "exact · from your Dailies & Practice"
      : "exact · from your Dailies & Practice",
    chips: empty
      ? [
          { label: "Unaided", value: "—" },
          { label: "Books", value: "0/66" },
          { label: "Median miss", value: "—" },
        ]
      : [
          { label: "Unaided", value: overall.unaidedRate },
          {
            label: "Books",
            value: `${overall.booksTested}/${overall.booksTotal}`,
          },
          { label: "Median miss", value: overall.medianMiss },
        ],
    stageLabel: stageFromProgress(mastery.totalRounds, booksTested),
    empty,
  };
}

function buildMap(mastery: MasteryReport): MapCardModel {
  const segments = bookSegments().map((s) => {
    const heat = mastery.bookHeat[s.osis];
    const tested = heat && heat.rounds > 0;
    return {
      osis: s.osis,
      name: s.name,
      t0: s.t0,
      t1: s.t1,
      heat: tested ? masteryHeatColor(heat.medianDistance) : null,
      medianDistance: tested ? heat.medianDistance : null,
      metric: tested ? formatMiss(heat.medianDistance) : "not tested",
      rounds: heat?.rounds ?? 0,
    };
  });
  return {
    segments,
    measuredCount: Object.keys(mastery.bookHeat).length,
  };
}

function bookPickRows(
  mastery: MasteryReport,
  mode: "far" | "close"
): BookPickRow[] {
  const measured = Object.values(mastery.bookHeat).filter((s) => s.rounds > 0);
  const sorted =
    mode === "far"
      ? [...measured].sort((a, b) => {
          if (b.medianDistance !== a.medianDistance) {
            return b.medianDistance - a.medianDistance;
          }
          return b.avgDistance - a.avgDistance;
        })
      : [...measured].sort((a, b) => {
          if (a.medianDistance !== b.medianDistance) {
            return a.medianDistance - b.medianDistance;
          }
          return a.avgDistance - b.avgDistance;
        });
  return sorted.map((s) => ({
    osis: s.id,
    name: s.label,
    metric: formatMiss(s.medianDistance),
    heat: masteryHeatColor(s.medianDistance),
    rounds: s.rounds,
    medianDistance: s.medianDistance,
  }));
}

function buildNext(unlocks: AchievementView[]): NextMarkModel | null {
  const next = nextClosestAchievement(unlocks);
  if (!next) return null;
  return {
    id: next.id,
    title: next.title,
    description: next.description,
    current: next.current ?? 0,
    threshold: next.threshold ?? 0,
    progress: next.progress ?? 0,
    dropCap: next.dropCap,
    metal: next.metal,
    ladder: next.ladder,
  };
}

/**
 * Curate a short trail: seeds + open rung at progress, capped at 6.
 * Status: passed / now (first locked with highest progress) / ahead.
 */
export function buildTrailNodes(
  ladder: AchievementView[],
  maxNodes = 6
): TrailNode[] {
  if (!ladder.length) return [];
  const sorted = [...ladder].sort(
    (a, b) => (a.threshold ?? 0) - (b.threshold ?? 0)
  );
  const locked = sorted.filter((a) => !a.unlocked);
  const nowId =
    locked.length === 0
      ? null
      : locked.reduce((best, a) => {
          const pa = a.progress ?? 0;
          const pb = best.progress ?? 0;
          if (pa > pb) return a;
          if (pa === pb && (a.threshold ?? 0) < (best.threshold ?? 0)) return a;
          return best;
        }).id;

  // Prefer evenly spaced sample including first, now, last
  let chosen = sorted;
  if (sorted.length > maxNodes) {
    const ids = new Set<string>();
    ids.add(sorted[0]!.id);
    ids.add(sorted[sorted.length - 1]!.id);
    if (nowId) ids.add(nowId);
    const step = (sorted.length - 1) / (maxNodes - 1);
    for (let i = 0; i < maxNodes; i++) {
      const idx = Math.round(i * step);
      ids.add(sorted[Math.min(sorted.length - 1, idx)]!.id);
    }
    chosen = sorted.filter((a) => ids.has(a.id)).slice(0, maxNodes);
    // Ensure now is present
    if (nowId && !chosen.some((c) => c.id === nowId)) {
      const n = sorted.find((a) => a.id === nowId);
      if (n) {
        chosen = [...chosen.slice(0, maxNodes - 1), n].sort(
          (a, b) => (a.threshold ?? 0) - (b.threshold ?? 0)
        );
      }
    }
  }

  let seenNow = false;
  return chosen.map((a) => {
    let status: TrailNodeStatus;
    if (a.unlocked) status = "passed";
    else if (a.id === nowId && !seenNow) {
      status = "now";
      seenNow = true;
    } else if (nowId && (a.threshold ?? 0) > (sorted.find((x) => x.id === nowId)?.threshold ?? 0)) {
      status = "ahead";
    } else if (!a.unlocked && !nowId) {
      status = "ahead";
    } else if (!a.unlocked) {
      status = "ahead";
    } else {
      status = "passed";
    }
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      threshold: a.threshold ?? 0,
      current: a.current ?? 0,
      progress: a.progress ?? 0,
      status,
      dropCap: a.dropCap,
      metal: a.metal,
    };
  });
}

function buildMarksPath(unlocks: AchievementView[]): MarksPathModel {
  const paths: MarksPathEntry[] = PRIMARY_PATH_LABELS.map(({ key, label }) => {
    const fullLadder = unlocks
      .filter((a) => a.ladder === key)
      .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));
    // Also include only-unlocked without ladder filter from same key
    return {
      key,
      label,
      nodes: buildTrailNodes(fullLadder, 6),
      fullLadder,
    };
  });
  return { paths };
}

function buildTrain(
  far: BookPickModel,
  biasOsis?: string | null
): TrainCardModel {
  const bias =
    biasOsis != null
      ? far.rows.find((r) => r.osis === biasOsis) ??
        BOOKS.find((b) => b.osis === biasOsis)
      : null;
  if (bias && "name" in bias) {
    const name = "metric" in bias ? bias.name : bias.name;
    const osis = "osis" in bias ? bias.osis : (bias as { osis: string }).osis;
    return {
      primaryLabel: `Practice ${name}`,
      secondaryLabel: "Daily",
      primaryAction: "practice-book",
      bookOsis: osis,
      bookName: name,
    };
  }
  return {
    primaryLabel: "Practice",
    secondaryLabel: "Daily",
    primaryAction: "practice",
  };
}

function buildIndex(
  model: Omit<DeckModel, "index">,
  cards: DeckCardId[]
): IndexModel {
  const storyMeta: Record<DeckCardId, () => { title: string; meta: string }> = {
    you: () => ({
      title: "You",
      meta: model.you.empty
        ? "Empty ledger"
        : `${model.you.stageLabel} · ${model.you.heroValue} exact`,
    }),
    map: () => ({
      title: "Canon map",
      meta: `${model.map.measuredCount} books tested`,
    }),
    far: () => ({
      title: "Far",
      meta: model.far.rows[0]
        ? `${model.far.rows[0].name} · ${model.far.rows[0].metric}`
        : "No weak books yet",
    }),
    close: () => ({
      title: "Close",
      meta: model.close.rows[0]
        ? `${model.close.rows[0].name} · ${model.close.rows[0].metric}`
        : "No strong books yet",
    }),
    next: () => ({
      title: "Next checkpoint",
      meta: model.next?.title ?? "All caught up",
    }),
    "marks-path": () => ({
      title: "Marks path",
      meta: "Unaided · Exact · Show up",
    }),
    train: () => ({
      title: "Train",
      meta: model.train.primaryLabel,
    }),
    index: () => ({ title: "Index", meta: "You are here" }),
  };

  const story: IndexStoryRow[] = cards
    .filter((id) => id !== "index")
    .map((cardId, i) => {
      const m = storyMeta[cardId]();
      return {
        cardId,
        n: String(i + 1).padStart(2, "0"),
        title: m.title,
        meta: m.meta,
      };
    });

  const earned = model.unlocks.filter((u) => u.unlocked).length;
  const fullData: IndexSheetRow[] = [
    { sheetId: "stats", title: "Full stats", meta: "Overall · genre · book" },
    {
      sheetId: "books",
      title: "All 66 books",
      meta: `${model.map.measuredCount} tested`,
    },
    {
      sheetId: "marks-all",
      title: "Every mark",
      meta: "All ladders",
    },
    {
      sheetId: "earned",
      title: "Earned unlocks",
      meta: `${earned} unlocked`,
    },
    {
      sheetId: "genres",
      title: "Genres",
      meta: "6 aggregates",
    },
  ];

  return { story, fullData };
}

/**
 * Build the full deck model from live state.
 * @param trainBiasOsis session-only weak-book bias for train CTAs
 */
export function buildDeckModel(
  state: AppState,
  trainBiasOsis?: string | null
): DeckModel {
  const mastery = computeMastery(state);
  const unlocks = listAchievements(state);
  const overall = buildOverallStats(state);
  const empty = mastery.totalRounds === 0;
  const you = buildYou(state, mastery);
  const map = buildMap(mastery);
  const far: BookPickModel = {
    rows: bookPickRows(mastery, "far"),
    sheetFilter: "far",
  };
  const close: BookPickModel = {
    rows: bookPickRows(mastery, "close"),
    sheetFilter: "close",
  };
  const next = empty ? null : buildNext(unlocks);
  const marksPath = buildMarksPath(unlocks);
  const train = buildTrain(far, trainBiasOsis);

  const cards: DeckCardId[] = empty
    ? ["you", "index"]
    : [
        "you",
        "map",
        "far",
        "close",
        ...(next ? (["next"] as const) : []),
        "marks-path",
        "train",
        "index",
      ];

  const partial: Omit<DeckModel, "index"> = {
    empty,
    cards,
    you,
    map,
    far,
    close,
    next,
    marksPath,
    train,
    overall,
    unlocks,
  };

  return {
    ...partial,
    index: buildIndex(partial, cards),
  };
}

/** Full ladder for one path key from unlocks list. */
export function ladderForPath(
  unlocks: readonly AchievementView[],
  pathKey: string
): AchievementView[] {
  return unlocks
    .filter((a) => a.ladder === pathKey)
    .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0));
}
