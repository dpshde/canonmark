/**
 * Achievements snap deck + full-data sheets (presentation only).
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

function linkish(
  text: string,
  onClick: () => void
): HTMLButtonElement {
  const b = el("button", {
    class: "deck-linkish",
    type: "button",
    text,
  });
  b.addEventListener("click", () => {
    onClick();
  });
  return b;
}

function cardShell(
  id: DeckCardId,
  kicker: string,
  children: HTMLElement[]
): HTMLElement {
  const card = el("section", {
    class: "deck-card",
    id: `deck-card-${id}`,
    "data-card": id,
  });
  card.append(el("p", { class: "deck-kicker", text: kicker }));
  const grow = el("div", { class: "deck-grow" });
  for (const c of children) grow.append(c);
  card.append(grow);
  return card;
}

function renderYouCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const kids: HTMLElement[] = [
    el("h2", { class: "deck-headline", text: model.you.headline }),
  ];
  if (model.you.empty) {
    kids.push(
      el("p", {
        class: "deck-sub",
        text: "Daily or Practice — one verse is enough to open the map.",
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
    const big = el("div", { class: "deck-big-stat", text: model.you.heroValue });
    big.append(
      el("span", { class: "deck-big-stat-unit", text: model.you.heroUnit })
    );
    kids.push(big);
    const chips = el("div", { class: "deck-chip-row" });
    for (const c of model.you.chips) {
      const chip = el("span", { class: "deck-chip" });
      chip.append(
        document.createTextNode(`${c.label} `),
        el("strong", { text: c.value })
      );
      chips.append(chip);
    }
    kids.push(chips);
    kids.push(
      el("p", {
        class: "deck-stage",
        text: `Stage · ${model.you.stageLabel}`,
      })
    );
  }
  const card = cardShell("you", "You", kids);
  const foot = el("div", { class: "deck-foot" });
  if (!model.you.empty) {
    foot.append(
      linkish("Full stats · every metric", () => {
        handlers.haptic?.();
        openSheet("stats", loadFromModel(model), model, handlers);
      })
    );
  }
  foot.append(
    el("p", {
      class: "deck-hint-swipe",
      text: model.empty ? "Swipe for index" : "Swipe",
    })
  );
  card.append(foot);
  return card;
}

/** Keep state ref for sheets opened from cards — set on each render. */
let lastState: AppState | null = null;

function loadFromModel(_model: DeckModel): AppState {
  return lastState!;
}

function renderMapCard(
  model: DeckModel,
  handlers: DeckHandlers,
  state: AppState
): HTMLElement {
  const kids: HTMLElement[] = [
    el("h2", {
      class: "deck-headline",
      text: "Where you're warm — and where you're guessing.",
    }),
  ];
  const stage = el("div", { class: "deck-map-stage" });
  const rail = el("div", {
    class: "deck-map-rail",
    role: "group",
    "aria-label": "Canon heat by book",
  });
  const readout = el("div", { class: "deck-map-readout" });
  const nameEl = el("p", { class: "deck-map-name", text: "Tap a book" });
  const metaEl = el("p", { class: "deck-map-meta", text: "" });
  readout.append(nameEl, metaEl);

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
        : "Not tested yet";
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
    ]),
    readout
  );
  kids.push(stage);
  if (selected) update(selected);

  const card = cardShell("map", "Canon map", kids);
  const foot = el("div", { class: "deck-foot" });
  foot.append(
    linkish("All 66 books · complete", () => {
      handlers.haptic?.();
      openSheet("books", state, model, handlers);
    })
  );
  card.append(foot);
  return card;
}

function renderPickCard(
  id: "far" | "close",
  model: DeckModel,
  handlers: DeckHandlers,
  state: AppState,
  onBias?: (osis: string) => void
): HTMLElement {
  const pick = id === "far" ? model.far : model.close;
  const kicker = id === "far" ? "Far" : "Close";
  const headline =
    id === "far"
      ? "Books that still pull you off the map."
      : "Books you already place with less miss.";
  const kids: HTMLElement[] = [
    el("h2", { class: "deck-headline", text: headline }),
  ];
  const list = el("div", { class: "deck-pick-list" });
  const top = pick.rows.slice(0, 3);
  if (!top.length) {
    kids.push(
      el("p", {
        class: "deck-sub",
        text: "Play more rounds to rank books.",
      })
    );
  } else {
    for (const row of top) {
      const btn = el("button", {
        class: "deck-pick-row",
        type: "button",
        "data-osis": row.osis,
      });
      const swatch = el("span", { class: "deck-pick-swatch" });
      swatch.style.background = row.heat;
      btn.append(
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
    }
    kids.push(list);
  }
  const card = cardShell(id, kicker, kids);
  const foot = el("div", { class: "deck-foot" });
  foot.append(
    linkish(
      id === "far"
        ? "Full far list · every book"
        : "Full close list · every book",
      () => {
        handlers.haptic?.();
        openSheet("books", state, model, handlers, { filter: id });
      }
    )
  );
  card.append(foot);
  return card;
}

function renderNextCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const next = model.next!;
  const kids: HTMLElement[] = [
    el("h2", { class: "deck-headline", text: "Next checkpoint" }),
  ];
  const face = el("div", { class: "deck-next-face" });
  const frame = el("div", {
    class: `achievement-dropcap-frame metal-${next.metal} is-featured`,
    "aria-hidden": "true",
  });
  const img = document.createElement("img");
  img.className = "achievement-dropcap";
  img.alt = "";
  img.width = 88;
  img.height = 88;
  img.decoding = "async";
  if (handlers.bindDropCap) {
    handlers.bindDropCap(img, handlers.baseUrl, next.dropCap, next.metal);
  } else {
    img.src = `${handlers.baseUrl}${next.dropCap}`;
  }
  frame.append(img);
  face.append(
    frame,
    el("p", { class: "deck-next-title", text: next.title }),
    el("p", { class: "deck-next-desc", text: next.description }),
    el("p", {
      class: "deck-next-progress",
      text: `${next.current.toLocaleString()} / ${next.threshold.toLocaleString()}`,
    })
  );
  const bar = el("div", { class: "achievement-progress deck-next-bar" }, [
    el("div", {
      class: "achievement-progress-fill",
      style: `width:${Math.round(Math.max(0, next.progress) * 100)}%`,
    }),
  ]);
  face.append(bar);
  kids.push(face);
  const card = cardShell("next", "Next", kids);
  const foot = el("div", { class: "deck-foot" });
  foot.append(
    linkish("All earned unlocks", () => {
      handlers.haptic?.();
      openSheet("earned", lastState!, model, handlers);
    })
  );
  card.append(foot);
  return card;
}

function renderMarksPathCard(
  model: DeckModel,
  handlers: DeckHandlers,
  state: AppState
): HTMLElement {
  const kids: HTMLElement[] = [
    el("h2", {
      class: "deck-headline",
      text: "Lifelong marks — one path at a time.",
    }),
  ];
  const tabs = el("div", {
    class: "path-tabs",
    role: "tablist",
    "aria-label": "Skill paths",
  });
  const trail = el("div", { class: "trail", role: "list" });
  const face = el("div", { class: "trail-face" });

  let activeKey = model.marksPath.paths[0]?.key ?? "sight";

  const showPath = (path: MarksPathEntry) => {
    activeKey = path.key;
    for (const t of tabs.querySelectorAll(".path-tab")) {
      const on = (t as HTMLElement).dataset.path === path.key;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    }
    trail.replaceChildren();
    let focus =
      path.nodes.find((n) => n.status === "now") ??
      path.nodes[path.nodes.length - 1] ??
      null;
    const paintFace = (node: (typeof path.nodes)[0] | null) => {
      face.replaceChildren();
      if (!node) {
        face.append(el("p", { class: "deck-sub", text: "No rungs on this path yet." }));
        return;
      }
      face.append(
        el("p", {
          class: "trail-face-status",
          text:
            node.status === "passed"
              ? "Passed"
              : node.status === "now"
                ? "Now"
                : "Ahead",
        }),
        el("p", { class: "trail-face-title", text: node.title }),
        el("p", { class: "trail-face-desc", text: node.description }),
        el("p", {
          class: "trail-face-meta",
          text: `${node.current.toLocaleString()} / ${node.threshold.toLocaleString()}`,
        })
      );
    };
    for (const node of path.nodes) {
      const btn = el("button", {
        class: `trail-node is-${node.status}`,
        type: "button",
        role: "listitem",
        text: String(node.threshold),
        title: node.title,
      });
      btn.addEventListener("click", () => {
        handlers.haptic?.();
        focus = node;
        for (const n of trail.querySelectorAll(".trail-node")) {
          n.classList.toggle("is-focus", n === btn);
        }
        paintFace(node);
      });
      if (node === focus) btn.classList.add("is-focus");
      trail.append(btn);
    }
    paintFace(focus);
  };

  for (const path of model.marksPath.paths) {
    const tab = el("button", {
      class: `path-tab${path.key === activeKey ? " is-on" : ""}`,
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
    tabs.append(tab);
  }
  kids.push(tabs, trail, face);
  const first = model.marksPath.paths.find((p) => p.key === activeKey);
  if (first) showPath(first);

  const card = cardShell("marks-path", "Marks path", kids);
  const foot = el("div", { class: "deck-foot" });
  foot.append(
    linkish("All marks on this path · complete", () => {
      handlers.haptic?.();
      openSheet("marks", state, model, handlers, { pathKey: activeKey });
    }),
    linkish("Every mark · all paths", () => {
      handlers.haptic?.();
      openSheet("marks-all", state, model, handlers);
    })
  );
  card.append(foot);
  return card;
}

function renderTrainCard(
  model: DeckModel,
  handlers: DeckHandlers
): HTMLElement {
  const kids: HTMLElement[] = [
    el("h2", {
      class: "deck-headline",
      text: "Train the miss down.",
    }),
    el("p", {
      class: "deck-sub",
      text: model.train.bookName
        ? `Bias set: ${model.train.bookName}. Practice still draws the full pool — focus is yours.`
        : "Daily for ritual. Practice for volume.",
    }),
  ];
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
  kids.push(row);
  return cardShell("train", "Train", kids);
}

function renderIndexCard(
  model: DeckModel,
  handlers: DeckHandlers,
  state: AppState,
  scrollToCard: (id: DeckCardId) => void
): HTMLElement {
  const kids: HTMLElement[] = [
    el("h2", { class: "deck-headline", text: "Index" }),
  ];
  if (model.index.story.length) {
    kids.push(el("p", { class: "toc-section", text: "Story" }));
    const toc = el("nav", { class: "toc", "aria-label": "Story cards" });
    for (const row of model.index.story) {
      const btn = el("button", {
        class: "toc-row",
        type: "button",
        "data-goto": row.cardId,
      });
      btn.append(
        el("span", { class: "n", text: row.n }),
        el("span", { class: "t", text: row.title }),
        el("span", { class: "m", text: row.meta })
      );
      btn.addEventListener("click", () => {
        handlers.haptic?.();
        scrollToCard(row.cardId);
      });
      toc.append(btn);
    }
    kids.push(toc);
  }
  kids.push(el("p", { class: "toc-section", text: "Full data" }));
  const dataNav = el("nav", { class: "toc", "aria-label": "Full data sheets" });
  for (const row of model.index.fullData) {
    const btn = el("button", {
      class: "toc-row",
      type: "button",
    });
    btn.append(
      el("span", { class: "n", text: "··" }),
      el("span", { class: "t", text: row.title }),
      el("span", { class: "m", text: row.meta })
    );
    btn.addEventListener("click", () => {
      handlers.haptic?.();
      openSheet(row.sheetId, state, model, handlers, {
        filter: row.filter,
        pathKey: row.pathKey,
      });
    });
    dataNav.append(btn);
  }
  kids.push(dataNav);

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
  kids.push(actions);

  return cardShell("index", "Index", kids);
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
  lastState = state;
  const model = buildDeckModel(state, sessionTrainBias);

  app.innerHTML = "";
  const screen = el("div", {
    class: "screen achievements-deck active",
    id: "screen-achievements",
  });

  const chrome = el("div", { class: "deck-chrome" });
  chrome.append(el("h1", { text: "Achievements" }));
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
  chrome.append(actions);

  const deck = el("main", {
    class: "deck",
    id: "achievements-deck",
    "aria-label": "Achievements deck",
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
    map: () => renderMapCard(model, handlers, state),
    far: () =>
      renderPickCard("far", model, handlers, state, () => remountTrainLabels()),
    close: () => renderPickCard("close", model, handlers, state),
    next: () => renderNextCard(model, handlers),
    "marks-path": () => renderMarksPathCard(model, handlers, state),
    train: () => renderTrainCard(model, handlers),
    index: () => renderIndexCard(model, handlers, state, scrollToCard),
  };

  for (const id of model.cards) {
    const build = cardBuilders[id];
    if (build) deck.append(build());
  }

  const dots = el("div", {
    class: "deck-dots",
    role: "tablist",
    "aria-label": "Deck position",
  });
  const dotButtons: HTMLButtonElement[] = [];
  model.cards.forEach((id, i) => {
    const d = el("button", {
      type: "button",
      class: i === 0 ? "on" : "",
      "aria-label": `Card ${i + 1}`,
      "data-card": id,
    });
    d.addEventListener("click", () => {
      handlers.haptic?.();
      scrollToCard(id);
    });
    dots.append(d);
    dotButtons.push(d);
  });

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
      for (const d of dotButtons) {
        d.classList.toggle("on", d.dataset.card === best.id);
      }
    },
    { root: deck, threshold: [0.5, 0.65, 0.8] }
  );
  for (const card of deck.querySelectorAll(".deck-card")) {
    observer.observe(card);
  }

  screen.append(chrome, deck, dots);
  app.append(screen);
}

