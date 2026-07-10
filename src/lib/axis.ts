/**
 * Pure placement / viewport math for the 1,189-chapter canon axis.
 * Orientation is a transform: vertical (portrait) or horizontal (wide).
 */
import {
  BOOKS,
  TOTAL_CHAPTERS,
  TESTAMENT_SEAM_AFTER,
  bookAndChapterFromIndex,
} from "./books";

export type Orientation = "vertical" | "horizontal";

/** UI zoom presets for the canon timeline. */
export type ZoomPreset = "ot" | "nt" | "book";

/** OT: Gen–Mal (1…929). NT: Mat–Rev (930…1189). */
export const OT_END = TESTAMENT_SEAM_AFTER;
export const NT_START = TESTAMENT_SEAM_AFTER + 1;

export interface Viewport {
  /** Axis position of the view center in chapter-index units (1..1189). */
  center: number;
  /**
   * How many chapters fit across the full band length of the canvas.
   * Smaller = more zoomed in. Full-canon overview ≈ 1189.
   */
  span: number;
  orientation: Orientation;
  /** Pixel size along the band axis. */
  axisPx: number;
  /** Pixel size perpendicular to the band. */
  crossPx: number;
}

export interface HitResult {
  chapterIndex: number;
  /** 0..1 position along band from Genesis. */
  t: number;
}

/** Clamp chapter index to valid range. */
export function clampChapter(index: number): number {
  return Math.min(TOTAL_CHAPTERS, Math.max(1, Math.round(index)));
}

/** Map chapter index → 0..1 along the full canon. */
export function chapterToT(chapterIndex: number): number {
  return (clampChapter(chapterIndex) - 1) / (TOTAL_CHAPTERS - 1);
}

/** Map 0..1 → chapter index. */
export function tToChapter(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clampChapter(1 + clamped * (TOTAL_CHAPTERS - 1));
}

/**
 * Convert a pointer position on the band canvas to a chapter index.
 * For vertical: y along axis (Genesis at top, y=0).
 * For horizontal: x along axis (Genesis at left, x=0).
 */
export function hitTestChapter(
  axisCoordPx: number,
  viewport: Viewport
): HitResult {
  const { center, span, axisPx } = viewport;
  const half = span / 2;
  const tLocal = axisCoordPx / axisPx; // 0..1 within viewport
  const chapter = center - half + tLocal * span;
  const chapterIndex = clampChapter(chapter);
  return { chapterIndex, t: chapterToT(chapterIndex) };
}

/** Chapter index → pixel coordinate along the band axis for a viewport. */
export function chapterToAxisPx(
  chapterIndex: number,
  viewport: Viewport
): number {
  const { center, span, axisPx } = viewport;
  const half = span / 2;
  const rel = (chapterIndex - (center - half)) / span;
  return rel * axisPx;
}

export function visibleRange(viewport: Viewport): {
  start: number;
  end: number;
} {
  const half = viewport.span / 2;
  return {
    start: clampChapter(viewport.center - half),
    end: clampChapter(viewport.center + half),
  };
}

export interface BookSegment {
  osis: string;
  name: string;
  genre: string;
  startChapterIndex: number;
  endChapterIndex: number;
  /** 0..1 of full canon. */
  t0: number;
  t1: number;
}

export function bookSegments(): BookSegment[] {
  return BOOKS.map((b) => ({
    osis: b.osis,
    name: b.name,
    genre: b.genre,
    startChapterIndex: b.startChapterIndex,
    endChapterIndex: b.endChapterIndex,
    t0: chapterToT(b.startChapterIndex),
    t1: chapterToT(b.endChapterIndex),
  }));
}

export function testamentSeamT(): number {
  return chapterToT(TESTAMENT_SEAM_AFTER);
}

/** Zoom: smaller span = zoomed in. */
export function zoomViewport(
  viewport: Viewport,
  factor: number,
  focusChapter?: number
): Viewport {
  const focus = focusChapter ?? viewport.center;
  const nextSpan = Math.min(
    TOTAL_CHAPTERS * 1.05,
    Math.max(8, viewport.span / factor)
  );
  // Keep focus under the same relative position
  return {
    ...viewport,
    span: nextSpan,
    center: clampChapter(focus),
  };
}

export function panViewport(
  viewport: Viewport,
  deltaChapters: number
): Viewport {
  return {
    ...viewport,
    center: clampChapter(viewport.center + deltaChapters),
  };
}

export function defaultViewport(
  orientation: Orientation,
  axisPx: number,
  crossPx: number
): Viewport {
  return {
    center: Math.round(TOTAL_CHAPTERS / 2),
    span: TOTAL_CHAPTERS,
    orientation,
    axisPx,
    crossPx,
  };
}

/** Full canon overview (zoom off). */
export function viewportFullCanon(viewport: Viewport): Viewport {
  return {
    ...viewport,
    center: Math.round(TOTAL_CHAPTERS / 2),
    span: TOTAL_CHAPTERS,
  };
}

/**
 * Fit a chapter range into the viewport with a little end padding.
 * Short ranges (single-chapter books) get a minimum span so neighbors stay visible.
 */
export function viewportForRange(
  viewport: Viewport,
  startChapter: number,
  endChapter: number,
  options: { pad?: number; minSpan?: number } = {}
): Viewport {
  const pad = options.pad ?? 1.08;
  const minSpan = options.minSpan ?? 24;
  const lo = clampChapter(Math.min(startChapter, endChapter));
  const hi = clampChapter(Math.max(startChapter, endChapter));
  const width = hi - lo + 1;
  const span = Math.min(
    TOTAL_CHAPTERS * 1.05,
    Math.max(minSpan, width * pad)
  );
  const mid = (lo + hi) / 2;
  return {
    ...viewport,
    center: clampChapter(mid),
    span,
  };
}

/**
 * Apply a zoom preset.
 * - ot / nt: whole testament
 * - book: book containing `focusChapter` (falls back to viewport center)
 */
export function viewportForZoomPreset(
  viewport: Viewport,
  preset: ZoomPreset,
  focusChapter?: number
): Viewport {
  if (preset === "ot") {
    return viewportForRange(viewport, 1, OT_END, { pad: 1.04, minSpan: 80 });
  }
  if (preset === "nt") {
    return viewportForRange(viewport, NT_START, TOTAL_CHAPTERS, {
      pad: 1.06,
      minSpan: 40,
    });
  }
  // book
  const focus = clampChapter(focusChapter ?? viewport.center);
  const loc = bookAndChapterFromIndex(focus);
  if (!loc) {
    return viewportForRange(viewport, focus - 12, focus + 12, {
      pad: 1,
      minSpan: 24,
    });
  }
  const { book } = loc;
  // Short books: show ~24 chapters so context remains; long books: book + pad
  return viewportForRange(
    viewport,
    book.startChapterIndex,
    book.endChapterIndex,
    { pad: 1.2, minSpan: 28 }
  );
}
