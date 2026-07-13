/**
 * Overall / genre / book stats for achievements deck + full-data sheets.
 * Only dimensions derivable from durable mastery + lifetime rollups.
 * Unknown → "—".
 */
import { BOOKS, type Genre } from "./books";
import { effectiveLifetime } from "./achievements";
import {
  computeMastery,
  formatMiss,
  genreLabel,
  FOCUS_GENRE_IDS,
  type MasteryReport,
  type MasterySlice,
} from "./mastery";
import type { AppState } from "./storage";

export const DASH = "—";

export interface StatRow {
  key: string;
  value: string;
}

export interface OverallStats {
  rounds: number;
  dailyRounds: number;
  practiceRounds: number;
  exactCount: number;
  nearCount: number;
  exactRate: string;
  unaidedRate: string;
  booksTested: number;
  booksTotal: number;
  medianMiss: string;
  bestStreak: number;
  rows: StatRow[];
}

export interface GenreBookRow {
  osis: string;
  name: string;
  rounds: number;
  metric: string;
}

export interface GenreStats {
  key: Genre;
  label: string;
  rounds: number;
  exactCount: number;
  nearCount: number;
  exactRate: string;
  medianMiss: string;
  booksTested: number;
  booksTotal: number;
  books: GenreBookRow[];
  rows: StatRow[];
}

export interface BookStats {
  osis: string;
  name: string;
  genre: Genre;
  genreLabel: string;
  rounds: number;
  exactCount: number;
  nearCount: number;
  exactRate: string;
  medianMiss: string;
  /** Not available per-book from durable rollups. */
  unaided: string;
  rows: StatRow[];
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return DASH;
  return `${Math.round((part / whole) * 100)}%`;
}

function overallMedianMiss(mastery: MasteryReport): string {
  const measured = Object.values(mastery.bookHeat);
  if (!measured.length) return DASH;
  // Weighted by rounds across heat map slices (durable merge already applied).
  const distances: number[] = [];
  for (const s of measured) {
    for (let i = 0; i < s.rounds; i++) distances.push(s.medianDistance);
  }
  if (!distances.length) return DASH;
  distances.sort((a, b) => a - b);
  const mid = Math.floor(distances.length / 2);
  const m =
    distances.length % 2 === 1
      ? distances[mid]!
      : (distances[mid - 1]! + distances[mid]!) / 2;
  return formatMiss(m);
}

/**
 * Lifetime-level pulse + stats sheet overall table.
 */
export function buildOverallStats(state: AppState): OverallStats {
  const mastery = computeMastery(state);
  const L = effectiveLifetime(state);
  const rounds = mastery.totalRounds;
  const booksTested = Object.keys(mastery.bookHeat).length;
  const booksTotal = BOOKS.length;
  const exactRate = pct(mastery.exactCount, rounds);
  // Unaided = lifetime sight (exact, no hints) over lifetime exacts when available.
  const unaidedRate =
    L.exact > 0 ? pct(L.sight, L.exact) : rounds > 0 ? pct(L.sight, rounds) : DASH;
  const medianMiss = overallMedianMiss(mastery);

  const rows: StatRow[] = [
    { key: "Rounds", value: String(rounds) },
    { key: "Daily rounds", value: String(mastery.dailyRoundCount) },
    { key: "Practice rounds", value: String(mastery.practiceRoundCount) },
    { key: "Exact", value: String(mastery.exactCount) },
    { key: "Near", value: String(mastery.nearCount) },
    { key: "Exact rate", value: exactRate },
    { key: "Unaided rate", value: unaidedRate },
    { key: "Books tested", value: `${booksTested} / ${booksTotal}` },
    { key: "Median miss", value: medianMiss },
    {
      key: "Best streak",
      value: mastery.bestStreak > 0 ? String(mastery.bestStreak) : DASH,
    },
    { key: "Completed dailies", value: String(L.completedDailies) },
    { key: "Clean sheets", value: String(L.cleanSheets) },
  ];

  return {
    rounds,
    dailyRounds: mastery.dailyRoundCount,
    practiceRounds: mastery.practiceRoundCount,
    exactCount: mastery.exactCount,
    nearCount: mastery.nearCount,
    exactRate,
    unaidedRate,
    booksTested,
    booksTotal,
    medianMiss,
    bestStreak: mastery.bestStreak,
    rows,
  };
}

function heatForBook(
  mastery: MasteryReport,
  osis: string
): MasterySlice | undefined {
  return mastery.bookHeat[osis];
}

/**
 * Aggregate all books in a genre (including untested zeros).
 */
export function buildGenreStats(state: AppState, genreKey: string): GenreStats {
  const mastery = computeMastery(state);
  const genre = genreKey as Genre;
  const booksInGenre = BOOKS.filter((b) => b.genre === genre);
  let rounds = 0;
  let exactCount = 0;
  let nearCount = 0;
  const distPool: number[] = [];
  let booksTested = 0;
  const books: GenreBookRow[] = booksInGenre.map((b) => {
    const slice = heatForBook(mastery, b.osis);
    if (slice && slice.rounds > 0) {
      booksTested++;
      rounds += slice.rounds;
      exactCount += slice.exactCount;
      nearCount += slice.nearCount;
      for (let i = 0; i < slice.rounds; i++) distPool.push(slice.medianDistance);
      return {
        osis: b.osis,
        name: b.name,
        rounds: slice.rounds,
        metric: formatMiss(slice.medianDistance),
      };
    }
    return {
      osis: b.osis,
      name: b.name,
      rounds: 0,
      metric: DASH,
    };
  });

  let medianMiss = DASH;
  if (distPool.length) {
    distPool.sort((a, b) => a - b);
    const mid = Math.floor(distPool.length / 2);
    const m =
      distPool.length % 2 === 1
        ? distPool[mid]!
        : (distPool[mid - 1]! + distPool[mid]!) / 2;
    medianMiss = formatMiss(m);
  }

  const exactRate = pct(exactCount, rounds);
  const label = genreLabel(genre);
  const rows: StatRow[] = [
    { key: "Rounds", value: String(rounds) },
    { key: "Exact", value: String(exactCount) },
    { key: "Near", value: String(nearCount) },
    { key: "Exact rate", value: exactRate },
    { key: "Median miss", value: medianMiss },
    {
      key: "Books tested",
      value: `${booksTested} / ${booksInGenre.length}`,
    },
  ];

  return {
    key: genre,
    label,
    rounds,
    exactCount,
    nearCount,
    exactRate,
    medianMiss,
    booksTested,
    booksTotal: booksInGenre.length,
    books,
    rows,
  };
}

/**
 * Per-book detail. Dimensions not in rollups → "—".
 */
export function buildBookStats(
  state: AppState,
  osisOrName: string
): BookStats | null {
  const book =
    BOOKS.find((b) => b.osis === osisOrName) ??
    BOOKS.find((b) => b.name.toLowerCase() === osisOrName.toLowerCase());
  if (!book) return null;

  const mastery = computeMastery(state);
  const slice = heatForBook(mastery, book.osis);
  const rounds = slice?.rounds ?? 0;
  const exactCount = slice?.exactCount ?? 0;
  const nearCount = slice?.nearCount ?? 0;
  const exactRate = pct(exactCount, rounds);
  const medianMiss = rounds > 0 && slice ? formatMiss(slice.medianDistance) : DASH;

  const rows: StatRow[] = [
    { key: "Rounds", value: String(rounds) },
    { key: "Exact", value: rounds > 0 ? String(exactCount) : DASH },
    { key: "Near", value: rounds > 0 ? String(nearCount) : DASH },
    { key: "Exact rate", value: exactRate },
    { key: "Median miss", value: medianMiss },
    // Not stored per book in rollups
    { key: "Unaided", value: DASH },
    { key: "Hints used", value: DASH },
  ];

  return {
    osis: book.osis,
    name: book.name,
    genre: book.genre,
    genreLabel: genreLabel(book.genre),
    rounds,
    exactCount,
    nearCount,
    exactRate,
    medianMiss,
    unaided: DASH,
    rows,
  };
}

/** All six genres with aggregates (for genres sheet). */
export function buildAllGenreStats(state: AppState): GenreStats[] {
  return FOCUS_GENRE_IDS.map((id) => buildGenreStats(state, id));
}

/** Sum of books across all genre stats (must be 66). */
export function genreBookCountSum(state: AppState): number {
  return buildAllGenreStats(state).reduce((n, g) => n + g.booksTotal, 0);
}
