/**
 * Achievements Wrapped-style story deck + full-data sheets (presentation only).
 * One claim per full-viewport card; top segment progress (not side dots).
 * View models from achievements-deck-model / achievements-stats.
 */
import {
  ALL_LADDER_LABELS,
  buildDeckModel,
  ladderForPath,
  type DeckCardId,
  type DeckModel,
  type MarksPathEntry,
  type SheetId,
} from "../lib/achievements-deck-model";
import {
  buildAllGenreStats,
  buildBookStats,
  buildGenreStats,
  buildOverallStats,
} from "../lib/achievements-stats";
import { BOOKS, type BookMeta, type Genre } from "../lib/books";
import type { AchievementMetal, AchievementView } from "../lib/achievements";
import type { AppState } from "../lib/storage";
import { FOCUS_GENRE_IDS } from "../lib/mastery";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export interface DeckHandlers {
  onHome: () => void;
  onThemeToggle: () => HTMLElement;
  onStartDaily: () => void;
  onStartPractice: (bookOsis?: string) => void;
  haptic?: () => void;
  /** Asset base URL for drop-caps */
  baseUrl: string;
  bindDropCap?: (
    img: HTMLImageElement,
    base: string,
    dropCap: string,
    metal: AchievementMetal
  ) => void;
}

/** Session-only far-book bias for train CTAs. */
let sessionTrainBias: string | null = null;

export function getSessionTrainBias(): string | null {
  return sessionTrainBias;
}

export function setSessionTrainBias(osis: string | null): void {
  sessionTrainBias = osis;
}

let sheetEscapeHandler: ((e: KeyboardEvent) => void) | null = null;
let activeSheetEl: HTMLElement | null = null;

export function closeSheet(): void {
  if (activeSheetEl) {
    activeSheetEl.remove();
    activeSheetEl = null;
  }
  document.body.classList.remove("sheet-open");
  const deck = document.querySelector(".deck");
  deck?.classList.remove("is-locked");
  if (sheetEscapeHandler) {
    document.removeEventListener("keydown", sheetEscapeHandler);
    sheetEscapeHandler = null;
  }
}

function openSheetHost(
  title: string,
  fill: (body: HTMLElement) => void
): void {
  closeSheet();
  const sheet = el("div", {
    class: "sheet is-open",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
  });
  const top = el("div", { class: "sheet-top" });
  const back = el("button", {
    class: "sheet-back btn-ghost",
    type: "button",
    text: "Back",
    "aria-label": "Close",
  });
  back.addEventListener("click", () => closeSheet());
  top.append(back, el("h2", { text: title }));
  const body = el("div", { class: "sheet-body" });
  fill(body);
  sheet.append(top, body);
  document.body.append(sheet);
  document.body.classList.add("sheet-open");
  document.querySelector(".deck")?.classList.add("is-locked");
  activeSheetEl = sheet;
  sheetEscapeHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
  };
  document.addEventListener("keydown", sheetEscapeHandler);
  back.focus();
}

function statTable(rows: { key: string; value: string }[]): HTMLElement {
  const table = el("div", { class: "sheet-stat-table", role: "table" });
  for (const row of rows) {
    table.append(
      el("div", { class: "sheet-stat-row", role: "row" }, [
        el("span", { class: "sheet-stat-key", text: row.key, role: "cell" }),
        el("span", { class: "sheet-stat-val", text: row.value, role: "cell" }),
      ])
    );
  }
  return table;
}

function achievementListItem(
  a: AchievementView,
  base: string,
  handlers: DeckHandlers
): HTMLElement {
  const li = el("li", {
    class: `sheet-mark-row ${a.unlocked ? "is-unlocked" : "is-locked"} metal-${a.metal}`,
  });
  const frame = el("div", {
    class: `achievement-dropcap-frame metal-${a.metal}`,
    "aria-hidden": "true",
  });
  const img = document.createElement("img");
  img.className = "achievement-dropcap";
  img.alt = "";
  img.width = 48;
  img.height = 48;
  img.decoding = "async";
  img.loading = "lazy";
  if (handlers.bindDropCap) {
    handlers.bindDropCap(img, base, a.dropCap, a.metal);
  } else {
    img.src = `${base}${a.dropCap}`;
  }
  frame.append(img);
  let meta = a.unlocked ? "Unlocked" : "Locked";
  if (!a.unlocked && a.threshold != null && a.current != null) {
    meta = `${a.current.toLocaleString()} / ${a.threshold.toLocaleString()}`;
  }
  const copy = el("div", { class: "sheet-mark-copy" }, [
    el("p", { class: "sheet-mark-title", text: a.title }),
    el("p", { class: "sheet-mark-desc", text: a.description }),
    el("span", { class: "sheet-mark-meta", text: meta }),
  ]);
  if (!a.unlocked && a.progress != null && a.progress > 0) {
    copy.append(
      el("div", { class: "achievement-progress" }, [
        el("div", {
          class: "achievement-progress-fill",
          style: `width:${Math.round(a.progress * 100)}%`,
        }),
      ])
    );
  }
  li.append(frame, copy);
  return li;
}

export function openSheet(
  id: SheetId,
  state: AppState,
  model: DeckModel,
  handlers: DeckHandlers,
  opts?: { filter?: string; pathKey?: string }
): void {
  const base = handlers.baseUrl;
  const titles: Record<SheetId, string> = {
    stats: "Stats",
    books: "Books",
    marks: "Marks",
    "marks-all": "All marks",
    earned: "Earned",
    genres: "Genres",
  };

  openSheetHost(titles[id], (body) => {
    if (id === "stats") {
      fillStatsSheet(body, state);
      return;
    }
    if (id === "books") {
      fillBooksSheet(body, model, opts?.filter);
      return;
    }
    if (id === "marks") {
      const key = opts?.pathKey ?? "sight";
      const label =
        ALL_LADDER_LABELS.find((l) => l.key === key)?.label ?? key;
      body.append(
        el("p", {
          class: "sheet-lead",
          text: `Full ladder · ${label}`,
        })
      );
      const list = el("ul", { class: "sheet-mark-list" });
      for (const a of ladderForPath(model.unlocks, key)) {
        list.append(achievementListItem(a, base, handlers));
      }
      body.append(list);
      return;
    }
    if (id === "marks-all") {
      body.append(
        el("p", {
          class: "sheet-lead",
          text: "Every ladder, complete",
        })
      );
      for (const { key, label } of ALL_LADDER_LABELS) {
        const ladder = ladderForPath(model.unlocks, key);
        if (!ladder.length) continue;
        body.append(el("h3", { class: "sheet-section", text: label }));
        const list = el("ul", { class: "sheet-mark-list" });
        for (const a of ladder) {
          list.append(achievementListItem(a, base, handlers));
        }
        body.append(list);
      }
      return;
    }
    if (id === "earned") {
      const earned = model.unlocks.filter((u) => u.unlocked);
      body.append(
        el("p", {
          class: "sheet-lead",
          text:
            earned.length === 0
              ? "No unlocks yet — play a round."
              : `${earned.length} unlocked`,
        })
      );
      const list = el("ul", { class: "sheet-mark-list" });
      for (const a of earned) {
        list.append(achievementListItem(a, base, handlers));
      }
      body.append(list);
      return;
    }
    if (id === "genres") {
      for (const g of buildAllGenreStats(state)) {
        const block = el("section", { class: "sheet-genre-block" });
        block.append(el("h3", { class: "sheet-section", text: g.label }));
        block.append(statTable(g.rows));
        body.append(block);
      }
    }
  });
}

function fillStatsSheet(body: HTMLElement, state: AppState): void {
  const overall = buildOverallStats(state);
  body.append(el("h3", { class: "sheet-section", text: "Overall" }));
  body.append(statTable(overall.rows));

  body.append(el("h3", { class: "sheet-section", text: "Genre" }));
  const genreSelect = el("select", {
    class: "sheet-select",
    "aria-label": "Genre",
  }) as HTMLSelectElement;
  for (const id of FOCUS_GENRE_IDS) {
    const opt = el("option", { value: id, text: buildGenreStats(state, id).label });
    genreSelect.append(opt);
  }
  const genreDetail = el("div", { class: "sheet-detail-panel" });
  body.append(genreSelect, genreDetail);

  body.append(el("h3", { class: "sheet-section", text: "Book" }));
  const bookSelect = el("select", {
    class: "sheet-select",
    "aria-label": "Book",
  }) as HTMLSelectElement;
  for (const b of BOOKS) {
    bookSelect.append(el("option", { value: b.osis, text: b.name }));
  }
  const bookDetail = el("div", { class: "sheet-detail-panel" });
  body.append(bookSelect, bookDetail);

  const renderGenre = (key: string) => {
    const g = buildGenreStats(state, key);
    genreDetail.replaceChildren();
    genreDetail.append(statTable(g.rows));
    const books = el("ul", { class: "sheet-book-mini" });
    for (const b of g.books) {
      books.append(
        el("li", {
          text: `${b.name} · ${b.rounds ? b.metric : "not tested"}`,
        })
      );
    }
    genreDetail.append(books);
  };

  const renderBook = (osis: string) => {
    const b = buildBookStats(state, osis);
    bookDetail.replaceChildren();
    if (!b) return;
    bookDetail.append(
      el("p", {
        class: "sheet-lead",
        text: `${b.name} · ${b.genreLabel}`,
      })
    );
    bookDetail.append(statTable(b.rows));
    // Sync genre select for context
    genreSelect.value = b.genre;
    renderGenre(b.genre);
  };

  genreSelect.addEventListener("change", () => {
    renderGenre(genreSelect.value);
  });
  bookSelect.addEventListener("change", () => {
    renderBook(bookSelect.value);
  });

  renderGenre(genreSelect.value || "law");
  renderBook(bookSelect.value || BOOKS[0]!.osis);
}

function fillBooksSheet(
  body: HTMLElement,
  model: DeckModel,
  filter?: string
): void {
  const filters = el("div", { class: "sheet-filter-row", role: "group" });
  const modes: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "far", label: "Far" },
    { id: "close", label: "Close" },
    { id: "untested", label: "Untested" },
  ];
  let active = filter === "far" || filter === "close" ? filter : "all";
  const list = el("ul", { class: "sheet-book-list" });

  const farSet = new Set(model.far.rows.map((r) => r.osis));
  const closeSet = new Set(model.close.rows.map((r) => r.osis));
  // Far = weaker half of measured, close = stronger half; untested = no heat
  const measured = new Set(
    model.map.segments.filter((s) => s.rounds > 0).map((s) => s.osis)
  );

  const render = () => {
    list.replaceChildren();
    const byGenre = new Map<Genre, BookMeta[]>();
    for (const b of BOOKS) {
      const arr = byGenre.get(b.genre) ?? [];
      arr.push(b);
      byGenre.set(b.genre, arr);
    }
    for (const genreId of FOCUS_GENRE_IDS) {
      const books = byGenre.get(genreId) ?? [];
      const filtered = books.filter((b) => {
        if (active === "all") return true;
        if (active === "untested") return !measured.has(b.osis);
        if (active === "far") return farSet.has(b.osis);
        if (active === "close") return closeSet.has(b.osis);
        return true;
      });
      if (!filtered.length) continue;
      list.append(
        el("li", {
          class: "sheet-book-genre-head",
          text: buildGenreStatsLabel(genreId),
        })
      );
      for (const b of filtered) {
        const seg = model.map.segments.find((s) => s.osis === b.osis);
        const metric = seg && seg.rounds > 0 ? seg.metric : "not tested";
        list.append(
          el("li", {
            class: "sheet-book-row",
            text: `${b.name} · ${metric}`,
          })
        );
      }
    }
  };

  for (const m of modes) {
    const btn = el("button", {
      class: `sheet-filter-btn${active === m.id ? " is-on" : ""}`,
      type: "button",
      text: m.label,
    });
    btn.addEventListener("click", () => {
      active = m.id;
      for (const c of filters.children) {
        c.classList.toggle("is-on", c.textContent === m.label);
      }
      render();
    });
    filters.append(btn);
  }
  body.append(
    el("p", {
      class: "sheet-lead",
      text: "All 66 books",
    }),
    filters,
    list
  );
  render();
}

function buildGenreStatsLabel(id: string): string {
  // Avoid recomputing full stats; mirror genreLabel via a throwaway call pattern
  const map: Record<string, string> = {
    law: "Law",
    history: "History",
    poetry: "Poetry",
    prophets: "Prophets",
    gospels: "Gospels",
    epistles: "Epistles",
  };
  return map[id] ?? id;
}

function cardShell(
  id: DeckCardId,
  children: HTMLElement[],
  opts?: { kicker?: string; tone?: string }
): HTMLElement {
  const tone = opts?.tone ? ` deck-card--${opts.tone}` : "";
  const card = el("section", {
    class: `deck-card${tone}`,
    id: `deck-card-${id}`,
    "data-card": id,
  });
  if (opts?.kicker) {
    card.append(el("p", { class: "deck-kicker", text: opts.kicker }));
  }
  const grow = el("div", { class: "deck-grow" });
  for (const c of children) grow.append(c);
  card.append(grow);
  return card;
}

/** Image-4 metric row: label over value, hairline pipes between cells. */
function metricsRow(
  items: { label: string; value: string }[]
): HTMLElement {
  const row = el("div", {
    class: "deck-metrics",
    role: "group",
    "aria-label": "Key stats",
  });
  items.forEach((c, i) => {
    if (i > 0) row.append(el("span", { class: "deck-metrics-rule", "aria-hidden": "true" }));
    const cell = el("div", { class: "deck-metrics-cell" });
    cell.append(
      el("span", { class: "deck-metrics-label", text: c.label }),
      el("span", { class: "deck-metrics-value", text: c.value })
    );
    row.append(cell);
  });
  return row;
}

/**
 * Image-4 stack: terracotta claim → charcoal hero → unit → pipe metrics.
 * One focal column, no orphaned kickers or chip boxes.
 */
function claimStack(opts: {
  claim?: string;
  hero?: string;
  unit?: string;
  metrics?: { label: string; value: string }[];
  extra?: HTMLElement[];
  /** Insert extras before hero (e.g. drop-cap on next card). */
  extraBeforeHero?: HTMLElement[];
}): HTMLElement {
  const stack = el("div", { class: "deck-stack" });
  if (opts.claim) {
    stack.append(el("p", { class: "deck-claim", text: opts.claim }));
  }
  if (opts.extraBeforeHero) {
    for (const node of opts.extraBeforeHero) stack.append(node);
  }
  if (opts.hero != null) {
    stack.append(el("p", { class: "deck-hero", text: opts.hero }));
  }
  if (opts.unit) {
    stack.append(el("p", { class: "deck-unit", text: opts.unit }));
  }
  if (opts.metrics?.length) {
    stack.append(metricsRow(opts.metrics));
  }
  if (opts.extra) {
    for (const node of opts.extra) stack.append(node);
  }
  return stack;
}

function renderYouCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const kids: HTMLElement[] = [];
  if (model.you.empty) {
    kids.push(
      claimStack({
        claim: model.you.headline,
        unit: "one verse opens the map",
      })
    );
    const cta = el("button", {
      class: "btn-primary",
      type: "button",
      text: "Start Daily",
    });
    cta.addEventListener("click", () => {
      handlers.haptic?.();
      handlers.onStartDaily();
    });
    kids.push(cta);
  } else {
    kids.push(
      claimStack({
        claim: model.you.headline,
        hero: model.you.heroValue,
        unit: model.you.heroUnit,
        metrics: model.you.chips,
      })
    );
  }
  return cardShell("you", kids, { tone: "pulse" });
}

function renderMapCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const stage = el("div", { class: "deck-map-stage" });
  const rail = el("div", {
    class: "deck-map-rail",
    role: "group",
    "aria-label": "Canon heat by book",
  });
  const nameEl = el("p", { class: "deck-hero deck-hero--sm", text: "—" });
  const metaEl = el("p", { class: "deck-unit", text: "tap a book" });

  let selected =
    model.map.segments.find((s) => s.rounds > 0)?.osis ??
    model.map.segments[0]?.osis ??
    null;

  const update = (osis: string) => {
    selected = osis;
    const seg = model.map.segments.find((s) => s.osis === osis);
    if (!seg) return;
    nameEl.textContent = seg.name;
    metaEl.textContent =
      seg.rounds > 0
        ? `${seg.metric} · ${seg.rounds} round${seg.rounds === 1 ? "" : "s"}`
        : "not tested yet";
    for (const btn of rail.querySelectorAll(".deck-map-seg")) {
      btn.classList.toggle("is-on", (btn as HTMLElement).dataset.osis === osis);
    }
  };

  for (const seg of model.map.segments) {
    const btn = el("button", {
      class: "deck-map-seg",
      type: "button",
      "data-osis": seg.osis,
      "data-heat":
        seg.medianDistance != null ? String(seg.medianDistance) : "",
      "aria-label": `${seg.name}, ${seg.metric}`,
      title: seg.name,
    });
    btn.style.background = seg.heat ?? "var(--rail)";
    btn.style.flexGrow = String(Math.max(0.5, (seg.t1 - seg.t0) * 100));
    btn.addEventListener("click", () => {
      handlers.haptic?.();
      update(seg.osis);
    });
    rail.append(btn);
  }
  stage.append(
    rail,
    el("div", { class: "deck-map-ends" }, [
      el("span", { text: "Genesis" }),
      el("span", { text: "Revelation" }),
    ])
  );
  if (selected) update(selected);

  const stack = claimStack({
    claim: "Where you're warm — and where you're guessing.",
    extra: [stage, nameEl, metaEl],
  });
  return cardShell("map", [stack], { tone: "map" });
}

function renderPickCard(
  id: "far" | "close",
  model: DeckModel,
  handlers: DeckHandlers,
  onBias?: (osis: string) => void
): HTMLElement {
  const pick = id === "far" ? model.far : model.close;
  const claim =
    id === "far"
      ? "Books that still pull you off the map."
      : "Books you already place with less miss.";
  const list = el("div", { class: "deck-pick-list" });
  const top = pick.rows.slice(0, 4);
  const extras: HTMLElement[] = [];
  if (!top.length) {
    extras.push(
      el("p", {
        class: "deck-unit",
        text: "play more rounds to rank books",
      })
    );
  } else {
    top.forEach((row, rank) => {
      const btn = el("button", {
        class: "deck-pick-row",
        type: "button",
        "data-osis": row.osis,
      });
      const swatch = el("span", { class: "deck-pick-swatch" });
      swatch.style.background = row.heat;
      btn.append(
        el("span", {
          class: "deck-pick-rank",
          text: String(rank + 1),
          "aria-hidden": "true",
        }),
        swatch,
        el("span", { class: "deck-pick-name", text: row.name }),
        el("span", { class: "deck-pick-metric", text: row.metric })
      );
      if (id === "far") {
        btn.addEventListener("click", () => {
          handlers.haptic?.();
          setSessionTrainBias(row.osis);
          onBias?.(row.osis);
          for (const c of list.querySelectorAll(".deck-pick-row")) {
            c.classList.toggle(
              "is-on",
              (c as HTMLElement).dataset.osis === row.osis
            );
          }
        });
      }
      list.append(btn);
    });
    extras.push(list);
  }
  return cardShell(id, [claimStack({ claim, extra: extras })], {
    tone: id,
  });
}

function renderNextCard(
  model: DeckModel,
  _handlers: DeckHandlers
): HTMLElement {
  const next = model.next!;
  // Type-only — no drop-cap tile. Claim → big title → progress.
  const bar = el("div", { class: "achievement-progress deck-next-bar" }, [
    el("div", {
      class: "achievement-progress-fill",
      style: `width:${Math.round(Math.max(0, next.progress) * 100)}%`,
    }),
  ]);
  return cardShell(
    "next",
    [
      claimStack({
        claim: "Next mark",
        hero: next.title,
        unit: `${next.current.toLocaleString()} of ${next.threshold.toLocaleString()}`,
        extra: [bar],
      }),
    ],
    { tone: "next" }
  );
}

/**
 * Marks — one path, one number. Quiet path switcher; no drop-caps, trail, or essays.
 */
function renderMarksPathCard(
  model: DeckModel,
  handlers: DeckHandlers,
  _state: AppState
): HTMLElement {
  const paths = model.marksPath.paths;
  const switcher = el("div", {
    class: "path-switch",
    role: "tablist",
    "aria-label": "Skill paths",
  });
  const host = el("div", { class: "deck-marks-focus" });

  let activeKey = paths[0]?.key ?? "sight";

  const showPath = (path: MarksPathEntry) => {
    activeKey = path.key;
    for (const t of switcher.querySelectorAll(".path-switch-btn")) {
      const on = (t as HTMLElement).dataset.path === path.key;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    }
    host.replaceChildren();
    const node =
      path.nodes.find((n) => n.status === "now") ??
      path.nodes[path.nodes.length - 1] ??
      null;
    if (!node) {
      host.append(
        claimStack({
          claim: path.label,
          hero: "—",
          unit: "no progress yet",
        })
      );
      return;
    }
    const bar = el("div", { class: "achievement-progress deck-next-bar" }, [
      el("div", {
        class: "achievement-progress-fill",
        style: `width:${Math.round(Math.max(0, node.progress) * 100)}%`,
      }),
    ]);
    // claim = rung title, hero = count, unit = path · threshold only
    host.append(
      claimStack({
        claim: node.title,
        hero: node.current.toLocaleString(),
        unit: `${path.label} · of ${node.threshold.toLocaleString()}`,
        extra: [bar],
      })
    );
  };

  paths.forEach((path, i) => {
    if (i > 0) {
      switcher.append(
        el("span", { class: "path-switch-sep", text: "·", "aria-hidden": "true" })
      );
    }
    const tab = el("button", {
      class: `path-switch-btn${path.key === activeKey ? " is-on" : ""}`,
      type: "button",
      role: "tab",
      "data-path": path.key,
      text: path.label,
      "aria-selected": path.key === activeKey ? "true" : "false",
    });
    tab.addEventListener("click", () => {
      handlers.haptic?.();
      showPath(path);
    });
    switcher.append(tab);
  });

  const first = paths.find((p) => p.key === activeKey);
  if (first) showPath(first);

  const wrap = el("div", { class: "deck-marks-wrap" });
  wrap.append(host, switcher);
  return cardShell("marks-path", [wrap], { tone: "marks" });
}

function renderTrainCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const row = el("div", { class: "deck-train-row" });
  const primary = el("button", {
    class: "btn-primary",
    type: "button",
    text: model.train.primaryLabel,
    id: "deck-train-primary",
  });
  primary.addEventListener("click", () => {
    handlers.haptic?.();
    handlers.onStartPractice(
      model.train.primaryAction === "practice-book"
        ? model.train.bookOsis
        : undefined
    );
  });
  const secondary = el("button", {
    class: "btn-secondary",
    type: "button",
    text: model.train.secondaryLabel,
  });
  secondary.addEventListener("click", () => {
    handlers.haptic?.();
    handlers.onStartDaily();
  });
  row.append(primary, secondary);

  const stack = claimStack({
    claim: "Train the miss down.",
    unit: model.train.bookName
      ? `bias · ${model.train.bookName}`
      : "daily for ritual · practice for volume",
    extra: [row],
  });
  return cardShell("train", [stack], { tone: "train" });
}

/** Deck + index list previews — DESIGN.md: ~4 rows, expand in place. */
const PREVIEW_ROWS = 4;

function appendExpandableList<T>(
  host: HTMLElement,
  items: T[],
  renderRow: (item: T) => HTMLElement,
  moreLabel: (hidden: number) => string
): void {
  const preview = items.slice(0, PREVIEW_ROWS);
  const rest = items.slice(PREVIEW_ROWS);
  for (const item of preview) host.append(renderRow(item));
  if (!rest.length) return;

  const more = el("div", { class: "toc-more", hidden: "true" });
  for (const item of rest) more.append(renderRow(item));
  const toggle = el("button", {
    class: "toc-expand",
    type: "button",
    "aria-expanded": "false",
  });
  const setLabel = (open: boolean) => {
    toggle.textContent = open
      ? "Show less"
      : moreLabel(rest.length);
  };
  setLabel(false);
  toggle.addEventListener("click", () => {
    handlersHapticSoft();
    const open = more.hasAttribute("hidden");
    if (open) {
      more.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
    } else {
      more.setAttribute("hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
    }
    setLabel(open);
  });
  host.append(more, toggle);
}

/** Optional haptic from last deck mount — index expand should stay quiet-capable. */
let lastHaptic: (() => void) | undefined;
function handlersHapticSoft(): void {
  lastHaptic?.();
}

function renderIndexCard(
  model: DeckModel,
  handlers: DeckHandlers,
  state: AppState,
  scrollToCard: (id: DeckCardId) => void
): HTMLElement {
  lastHaptic = handlers.haptic;
  const extras: HTMLElement[] = [];

  if (model.index.story.length) {
    const block = el("div", { class: "toc-block" });
    block.append(el("p", { class: "toc-section", text: "Go to" }));
    const toc = el("nav", {
      class: "toc toc--dest",
      "aria-label": "Deck cards",
    });
    appendExpandableList(
      toc,
      model.index.story,
      (row) => {
        const btn = el("button", {
          class: "toc-dest",
          type: "button",
          "data-goto": row.cardId,
        });
        btn.append(
          el("span", { class: "toc-dest-t", text: row.title }),
          el("span", { class: "toc-dest-m", text: row.meta })
        );
        btn.addEventListener("click", () => {
          handlers.haptic?.();
          scrollToCard(row.cardId);
        });
        return btn;
      },
      (n) => `+${n} more`
    );
    block.append(toc);
    extras.push(block);
  }

  {
    const block = el("div", { class: "toc-block" });
    block.append(el("p", { class: "toc-section", text: "Open ledger" }));
    const dataNav = el("nav", {
      class: "toc toc--dest",
      "aria-label": "Full data sheets",
    });
    appendExpandableList(
      dataNav,
      model.index.fullData,
      (row) => {
        const btn = el("button", {
          class: "toc-dest",
          type: "button",
        });
        btn.append(
          el("span", { class: "toc-dest-t", text: row.title }),
          el("span", { class: "toc-dest-m", text: row.meta })
        );
        btn.addEventListener("click", () => {
          handlers.haptic?.();
          openSheet(row.sheetId, state, model, handlers, {
            filter: row.filter,
            pathKey: row.pathKey,
          });
        });
        return btn;
      },
      (n) => `+${n} more`
    );
    block.append(dataNav);
    extras.push(block);
  }

  const actions = el("div", { class: "toc-actions" });
  const daily = el("button", {
    class: "btn-primary",
    type: "button",
    text: model.empty ? "Start Daily" : "Daily",
  });
  daily.addEventListener("click", () => {
    handlers.haptic?.();
    handlers.onStartDaily();
  });
  const practice = el("button", {
    class: "btn-secondary",
    type: "button",
    text: "Practice",
  });
  practice.addEventListener("click", () => {
    handlers.haptic?.();
    handlers.onStartPractice();
  });
  actions.append(daily, practice);
  extras.push(actions);

  const stack = claimStack({
    claim: "Jump anywhere.",
    extra: extras,
  });
  stack.classList.add("deck-stack--ledger");
  return cardShell("index", [stack], { tone: "index" });
}

/**
 * Mount achievements deck into `app` root.
 */
export function renderAchievementsDeck(
  app: HTMLElement,
  state: AppState,
  handlers: DeckHandlers
): void {
  closeSheet();
  const model = buildDeckModel(state, sessionTrainBias);

  app.innerHTML = "";
  const screen = el("div", {
    class: "screen achievements-deck active",
    id: "screen-achievements",
  });

  // Chrome is type-only actions + story progress — no title competing with the card claim.
  const chrome = el("div", { class: "deck-chrome" });
  const progress = el("div", {
    class: "deck-progress",
    role: "tablist",
    "aria-label": "Story position",
  });
  const actions = el("div", { class: "deck-chrome-actions" });
  const themeBtn = handlers.onThemeToggle();
  const home = el("button", {
    class: "btn-ghost",
    type: "button",
    id: "btn-achievements-home",
    "aria-label": "Home",
    title: "Home",
  });
  home.innerHTML = `<svg class="home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3.75 10.5 12 3.75l8.25 6.75" />
    <path d="M5.75 9.25v10h12.5v-10M9.5 19.25v-5.5h5v5.5" />
  </svg>`;
  home.addEventListener("click", () => {
    handlers.haptic?.();
    closeSheet();
    handlers.onHome();
  });
  actions.append(themeBtn, home);

  const deck = el("main", {
    class: "deck",
    id: "achievements-deck",
    "aria-label": "Your year in marks",
  });

  const scrollToCard = (id: DeckCardId) => {
    const node = deck.querySelector(`#deck-card-${id}`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const remountTrainLabels = () => {
    const next = buildDeckModel(state, sessionTrainBias);
    const primary = deck.querySelector("#deck-train-primary");
    if (primary) primary.textContent = next.train.primaryLabel;
  };

  const cardBuilders: Record<DeckCardId, () => HTMLElement> = {
    you: () => renderYouCard(model, handlers),
    map: () => renderMapCard(model, handlers),
    far: () =>
      renderPickCard("far", model, handlers, () => remountTrainLabels()),
    close: () => renderPickCard("close", model, handlers),
    next: () => renderNextCard(model, handlers),
    "marks-path": () => renderMarksPathCard(model, handlers, state),
    train: () => renderTrainCard(model, handlers),
    index: () => renderIndexCard(model, handlers, state, scrollToCard),
  };

  for (const id of model.cards) {
    const build = cardBuilders[id];
    if (build) deck.append(build());
  }

  const segmentButtons: HTMLButtonElement[] = [];
  const cardLabels: Record<DeckCardId, string> = {
    you: "Your pulse",
    map: "Canon map",
    far: "Far books",
    close: "Close books",
    next: "Next mark",
    "marks-path": "Marks path",
    train: "Train",
    index: "Index",
  };
  model.cards.forEach((id, i) => {
    const seg = el("button", {
      type: "button",
      class: `deck-progress-seg${i === 0 ? " is-on" : ""}`,
      "aria-label": cardLabels[id] ?? `Card ${i + 1}`,
      "data-card": id,
    });
    seg.append(el("span", { class: "deck-progress-fill" }));
    seg.addEventListener("click", () => {
      handlers.haptic?.();
      scrollToCard(id);
    });
    progress.append(seg);
    segmentButtons.push(seg);
  });

  chrome.append(progress, actions);

  const setActiveCard = (activeId: string) => {
    const idx = model.cards.indexOf(activeId as DeckCardId);
    segmentButtons.forEach((seg, i) => {
      seg.classList.toggle("is-on", seg.dataset.card === activeId);
      seg.classList.toggle("is-past", idx >= 0 && i < idx);
      seg.classList.toggle("is-ahead", idx >= 0 && i > idx);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      let best: { id: string; ratio: number } | null = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = (e.target as HTMLElement).dataset.card;
        if (!id) continue;
        if (!best || e.intersectionRatio > best.ratio) {
          best = { id, ratio: e.intersectionRatio };
        }
      }
      if (!best) return;
      setActiveCard(best.id);
    },
    { root: deck, threshold: [0.5, 0.65, 0.8] }
  );
  for (const card of deck.querySelectorAll(".deck-card")) {
    observer.observe(card);
  }

  // Tap empty card chrome advances (Wrapped story feel); interactive controls keep the event.
  for (const card of deck.querySelectorAll(".deck-card")) {
    card.addEventListener("click", (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("button, a, input, select, textarea, [role='tab'], [role='listitem']")) {
        return;
      }
      const id = (card as HTMLElement).dataset.card as DeckCardId | undefined;
      if (!id) return;
      const i = model.cards.indexOf(id);
      if (i < 0 || i >= model.cards.length - 1) return;
      handlers.haptic?.();
      scrollToCard(model.cards[i + 1]!);
    });
  }

  screen.append(chrome, deck);
  app.append(screen);
}

