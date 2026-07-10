import { describe, it, expect } from "vitest";
import {
  chapterToT,
  tToChapter,
  hitTestChapter,
  chapterToAxisPx,
  clampChapter,
  defaultViewport,
  zoomViewport,
  panViewport,
  bookSegments,
  testamentSeamT,
  viewportForZoomPreset,
  viewportForRange,
  viewportFullCanon,
  OT_END,
  NT_START,
} from "../src/lib/axis";
import {
  chapterIndexFor,
  bookAndChapterFromIndex,
  TOTAL_CHAPTERS,
  TESTAMENT_SEAM_AFTER,
  QUADRANTS,
  BOOKS,
} from "../src/lib/books";

describe("canon axis metadata", () => {
  it("has 66 books and 1189 chapters", () => {
    expect(BOOKS).toHaveLength(66);
    expect(TOTAL_CHAPTERS).toBe(1189);
    expect(BOOKS[BOOKS.length - 1].endChapterIndex).toBe(1189);
  });

  it("ADR quadrant boundaries", () => {
    expect(QUADRANTS[0]).toMatchObject({
      startChapterIndex: 1,
      endChapterIndex: 436,
    });
    expect(QUADRANTS[1]).toMatchObject({
      startChapterIndex: 437,
      endChapterIndex: 929,
    });
    expect(QUADRANTS[2]).toMatchObject({
      startChapterIndex: 930,
      endChapterIndex: 1046,
    });
    expect(QUADRANTS[3]).toMatchObject({
      startChapterIndex: 1047,
      endChapterIndex: 1189,
    });
  });

  it("chapterIndexFor Genesis 1 = 1, Revelation 22 = 1189", () => {
    expect(chapterIndexFor("GEN", 1)).toBe(1);
    expect(chapterIndexFor("REV", 22)).toBe(1189);
    expect(chapterIndexFor("MAT", 1)).toBe(930);
    expect(chapterIndexFor("JOB", 1)).toBe(437);
  });

  it("bookAndChapterFromIndex round-trips", () => {
    const loc = bookAndChapterFromIndex(930);
    expect(loc?.book.osis).toBe("MAT");
    expect(loc?.chapter).toBe(1);
  });
});

describe("placement math", () => {
  it("chapterToT / tToChapter round-trip endpoints", () => {
    expect(chapterToT(1)).toBe(0);
    expect(chapterToT(TOTAL_CHAPTERS)).toBe(1);
    expect(tToChapter(0)).toBe(1);
    expect(tToChapter(1)).toBe(TOTAL_CHAPTERS);
  });

  it("hitTest at axis midpoint of full-span viewport → mid canon", () => {
    const vp = defaultViewport("horizontal", 1000, 200);
    const hit = hitTestChapter(500, vp);
    expect(hit.chapterIndex).toBeGreaterThan(500);
    expect(hit.chapterIndex).toBeLessThan(700);
  });

  it("chapterToAxisPx inverse of hitTest near center", () => {
    const vp = defaultViewport("vertical", 800, 300);
    const ch = 600;
    const px = chapterToAxisPx(ch, vp);
    const hit = hitTestChapter(px, vp);
    expect(hit.chapterIndex).toBe(ch);
  });

  it("zoom reduces span; pan shifts center", () => {
    let vp = defaultViewport("horizontal", 500, 100);
    vp = zoomViewport(vp, 2, 100);
    expect(vp.span).toBeLessThan(TOTAL_CHAPTERS);
    expect(vp.center).toBe(100);
    const panned = panViewport(vp, 50);
    expect(panned.center).toBe(150);
  });

  it("clampChapter bounds", () => {
    expect(clampChapter(0)).toBe(1);
    expect(clampChapter(9999)).toBe(TOTAL_CHAPTERS);
  });

  it("testament seam after Malachi (929)", () => {
    expect(TESTAMENT_SEAM_AFTER).toBe(929);
    const t = testamentSeamT();
    expect(t).toBeGreaterThan(0.7);
    expect(t).toBeLessThan(0.85);
  });

  it("bookSegments cover full axis", () => {
    const segs = bookSegments();
    expect(segs).toHaveLength(66);
    expect(segs[0].startChapterIndex).toBe(1);
    expect(segs[65].endChapterIndex).toBe(1189);
  });
});

describe("zoom presets", () => {
  const base = defaultViewport("horizontal", 1000, 200);

  it("OT spans the Old Testament", () => {
    const vp = viewportForZoomPreset(base, "ot");
    expect(OT_END).toBe(929);
    expect(vp.center).toBeCloseTo((1 + OT_END) / 2, 0);
    expect(vp.span).toBeGreaterThan(800);
    expect(vp.span).toBeLessThan(TOTAL_CHAPTERS);
    // Genesis and Malachi should both be in view
    expect(vp.center - vp.span / 2).toBeLessThanOrEqual(2);
    expect(vp.center + vp.span / 2).toBeGreaterThanOrEqual(OT_END - 2);
  });

  it("NT spans the New Testament", () => {
    const vp = viewportForZoomPreset(base, "nt");
    expect(NT_START).toBe(930);
    expect(vp.center).toBeGreaterThan(1000);
    expect(vp.span).toBeLessThan(400);
    expect(vp.center - vp.span / 2).toBeLessThanOrEqual(NT_START + 5);
    expect(vp.center + vp.span / 2).toBeGreaterThanOrEqual(TOTAL_CHAPTERS - 5);
  });

  it("Book zooms to the book containing the focus chapter", () => {
    const psalms1 = chapterIndexFor("PSA", 1)!;
    const vp = viewportForZoomPreset(base, "book", psalms1);
    const loc = bookAndChapterFromIndex(psalms1)!;
    expect(vp.center).toBe(
      clampChapter(
        (loc.book.startChapterIndex + loc.book.endChapterIndex) / 2
      )
    );
    // Tighter than a full testament
    expect(vp.span).toBeLessThan(OT_END);
    expect(vp.span).toBeGreaterThan(loc.book.chapters * 0.9);
  });

  it("viewportForRange pads short books", () => {
    const obad = BOOKS.find((b) => b.osis === "OBA")!;
    const vp = viewportForRange(base, obad.startChapterIndex, obad.endChapterIndex, {
      minSpan: 28,
    });
    expect(obad.chapters).toBe(1);
    expect(vp.span).toBeGreaterThanOrEqual(28);
  });

  it("full canon clears a zoomed viewport", () => {
    const zoomed = viewportForZoomPreset(base, "nt");
    const full = viewportFullCanon(zoomed);
    expect(full.span).toBe(TOTAL_CHAPTERS);
    expect(full.center).toBe(Math.round(TOTAL_CHAPTERS / 2));
    expect(full.orientation).toBe(zoomed.orientation);
  });
});
