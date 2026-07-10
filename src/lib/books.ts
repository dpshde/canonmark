/**
 * Canonical 66-book / 1,189-chapter axis metadata.
 */
import booksData from "../data/books.json";

export type Genre =
  | "law"
  | "history"
  | "poetry"
  | "prophets"
  | "gospels"
  | "epistles";

export interface BookMeta {
  index: number;
  name: string;
  osis: string;
  bsb: string;
  chapters: number;
  /** Inclusive 1-based chapter index on the global axis. */
  startChapterIndex: number;
  endChapterIndex: number;
  genre: Genre;
  testament: "OT" | "NT";
}

export const TOTAL_CHAPTERS = 1189 as const;

export const BOOKS: readonly BookMeta[] = booksData.books as BookMeta[];

/** Testament-half quadrants (ADR: score-with-distance-and-hint-multiplier). */
export type TestamentQuadrant =
  | "ot-first"
  | "ot-second"
  | "nt-first"
  | "nt-second";

export interface QuadrantInfo {
  id: TestamentQuadrant;
  label: string;
  startChapterIndex: number;
  endChapterIndex: number;
}

export const QUADRANTS: readonly QuadrantInfo[] = [
  {
    id: "ot-first",
    label: "first half of the Old Testament (Law and History)",
    startChapterIndex: 1,
    endChapterIndex: 436,
  },
  {
    id: "ot-second",
    label: "second half of the Old Testament (Poetry and Prophets)",
    startChapterIndex: 437,
    endChapterIndex: 929,
  },
  {
    id: "nt-first",
    label: "first half of the New Testament (Gospels and Acts)",
    startChapterIndex: 930,
    endChapterIndex: 1046,
  },
  {
    id: "nt-second",
    label: "second half of the New Testament (Epistles and Revelation)",
    startChapterIndex: 1047,
    endChapterIndex: 1189,
  },
] as const;

export function chapterIndexFor(
  osis: string,
  chapter: number
): number | null {
  const book = BOOKS.find((b) => b.osis === osis);
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapters) return null;
  return book.startChapterIndex + chapter - 1;
}

export function bookAndChapterFromIndex(chapterIndex: number): {
  book: BookMeta;
  chapter: number;
} | null {
  if (chapterIndex < 1 || chapterIndex > TOTAL_CHAPTERS) return null;
  for (const book of BOOKS) {
    if (
      chapterIndex >= book.startChapterIndex &&
      chapterIndex <= book.endChapterIndex
    ) {
      return {
        book,
        chapter: chapterIndex - book.startChapterIndex + 1,
      };
    }
  }
  return null;
}

export function formatChapterLabel(chapterIndex: number): string {
  const loc = bookAndChapterFromIndex(chapterIndex);
  if (!loc) return `Ch ${chapterIndex}`;
  return `${loc.book.name} ${loc.chapter}`;
}

export function quadrantForChapter(chapterIndex: number): QuadrantInfo {
  for (const q of QUADRANTS) {
    if (
      chapterIndex >= q.startChapterIndex &&
      chapterIndex <= q.endChapterIndex
    ) {
      return q;
    }
  }
  return QUADRANTS[0];
}

/** Testament seam chapter index: last OT chapter. */
export const TESTAMENT_SEAM_AFTER = 929;
