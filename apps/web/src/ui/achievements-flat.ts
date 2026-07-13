/**
 * Flat achievements ledger — lifetime, canon map, focus lists, next, unlocks.
 * All data visible at once (scroll); no story deck.
 */
import {
  bookSegments,
  bookSegmentAtT,
  testamentSeamT,
} from "../lib/axis";
import {
  listAchievements,
  nextClosestAchievement,
  unlockedCount,
  type AchievementView,
} from "../lib/achievements";
import {
  booksForFocusMode,
  computeMastery,
  formatMiss,
  genresForFocusMode,
  masteryFocusMetric,
  masteryHeatColor,
  type MasteryReport,
  type MasterySlice,
} from "../lib/mastery";
import { loadState, markAchievementsSeen } from "../lib/storage";
import type { AchievementMetal } from "../lib/achievements";

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

export interface FlatAchievementsHandlers {
  onHome: () => void;
  onThemeToggle: () => HTMLElement;
  haptic?: () => void;
  baseUrl: string;
  bindDropCap: (
    img: HTMLImageElement,
    base: string,
    dropCap: string,
    metal: AchievementMetal
  ) => void;
}

export function renderAchievementsFlat(
  app: HTMLElement,
  handlers: FlatAchievementsHandlers
): void {
  markAchievementsSeen();
  const state = loadState();
  const mastery = computeMastery(state);
  const unlocks = listAchievements(state);
  const counts = unlockedCount(state);

  app.innerHTML = "";
  const screen = el("div", {
    class: "screen achievements active",
    id: "screen-achievements",
  });

  const top = el("div", { class: "achievements-top" });
  const back = el("button", {
    class: "btn-ghost",
    type: "button",
    id: "btn-achievements-home",
    "aria-label": "Home",
    title: "Home",
  });
  back.innerHTML = `<svg class="home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3.75 10.5 12 3.75l8.25 6.75" />
    <path d="M5.75 9.25v10h12.5v-10M9.5 19.25v-5.5h5v5.5" />
  </svg>`;
  back.addEventListener("click", () => {
    handlers.haptic?.();
    handlers.onHome();
  });
  const topActions = el("div", { class: "chrome-top-actions" });
  topActions.append(handlers.onThemeToggle(), back);
  top.append(
    el("div", {
      class: "achievements-top-spacer",
      "aria-hidden": "true",
    }),
    el("h1", { class: "achievements-heading", text: "Achievements" }),
    el("div", {
      class: "achievements-top-spacer",
      "aria-hidden": "true",
    })
  );
  screen.append(topActions, top);

  const body = el("div", { class: "achievements-body" });

  // —— Summary (boxed like canon map / focus) ——
  const summary = el("div", {
    class: "achievements-summary",
    "aria-label": "Lifetime summary",
  });
  summary.append(
    el("h2", { class: "achievements-section-label", text: "Lifetime" })
  );
  if (mastery.totalRounds === 0) {
    summary.append(
      el("p", {
        class: "achievements-empty",
        text: "Finish a daily or practice round to start your ledger.",
      })
    );
  } else {
    const grid = el("div", { class: "achievements-summary-grid" });
    const addStat = (key: string, value: string) => {
      grid.append(
        el("div", { class: "achievements-summary-stat" }, [
          el("span", { class: "achievements-summary-key", text: key }),
          el("span", { class: "achievements-summary-val", text: value }),
        ])
      );
    };
    addStat("Rounds", String(mastery.totalRounds));
    addStat("Daily", String(mastery.dailyRoundCount));
    addStat("Practice", String(mastery.practiceRoundCount));
    addStat("Exact", String(mastery.exactCount));
    addStat("Near", String(mastery.nearCount));
    if (mastery.bestStreak > 0) {
      addStat("Best streak", String(mastery.bestStreak));
    }
    summary.append(grid);
  }
  body.append(summary);

  if (mastery.totalRounds > 0) {
    const { map, focus } = makeMasterySection(mastery, handlers.haptic);
    body.append(map);

    // Radio tabs + lists sit immediately above Unlocks
    body.append(focus);
  }

  // —— Next closest locked goal, then the full unlocks log ——
  const next = nextClosestAchievement(unlocks);
  const base = handlers.baseUrl;

  if (next) {
    const nextBlock = el("section", {
      class: "achievement-next",
      "aria-label": "Next closest achievement",
    });
    nextBlock.append(
      el("h2", { class: "achievements-section-label", text: "Next" })
    );
    const nextList = el("ul", {
      class: "achievements-log achievements-next-log",
    });
    nextList.append(makeAchievementRow(next, base, handlers.bindDropCap, { featured: true }));
    nextBlock.append(nextList);
    body.append(nextBlock);
  }

  body.append(
    el("h2", {
      class: "achievements-section-label",
      text: counts.openEnded
        ? `Unlocks · ${counts.unlocked}`
        : `Unlocks · ${counts.unlocked} / ${counts.total}`,
    })
  );
  const log = el("ul", {
    class: "achievements-log",
    "aria-label": "Achievement log",
  });
  for (const a of unlocks) {
    log.append(makeAchievementRow(a, base, handlers.bindDropCap));
  }
  body.append(log);

  screen.append(body);
  app.append(screen);
}

function makeAchievementRow(
  a: AchievementView,
  base: string,
  bindDropCap: FlatAchievementsHandlers["bindDropCap"],
  opts: { featured?: boolean } = {}
): HTMLElement {
  const classes = [
    "achievement-row",
    a.unlocked ? "is-unlocked" : "is-locked",
    `metal-${a.metal}`,
  ];
  if (opts.featured) classes.push("is-next");
  const li = el("li", { class: classes.join(" ") });
  const frame = el("div", {
    class: `achievement-dropcap-frame metal-${a.metal}`,
    "aria-hidden": "true",
  });
  const cap = document.createElement("img");
  cap.className = "achievement-dropcap";
  cap.alt = "";
  cap.width = opts.featured ? 72 : 56;
  cap.height = opts.featured ? 72 : 56;
  cap.decoding = "async";
  cap.loading = opts.featured ? "eager" : "lazy";
  bindDropCap(cap, base, a.dropCap, a.metal);
  frame.append(cap);

  let meta = "Locked";
  if (a.unlocked) {
    const d = a.unlockedAt ? new Date(a.unlockedAt) : null;
    meta =
      d && Number.isFinite(d.getTime())
        ? d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Unlocked";
  } else if (a.threshold != null && a.current != null && a.threshold > 0) {
    meta = `${a.current.toLocaleString()} / ${a.threshold.toLocaleString()}`;
  }

  const head = el("p", { class: "achievement-head" }, [
    el("span", { class: "achievement-title", text: a.title }),
  ]);
  const desc = el("p", { class: "achievement-desc", text: a.description });
  const metaLine = el("span", { class: "achievement-meta", text: meta });
  const text = el("div", { class: "achievement-copy" });
  text.append(head, desc, metaLine);
  if (!a.unlocked && a.progress != null && (a.progress > 0 || opts.featured)) {
    const bar = el("div", { class: "achievement-progress" }, [
      el("div", {
        class: "achievement-progress-fill",
        style: `width:${Math.round(Math.max(0, a.progress) * 100)}%`,
      }),
    ]);
    text.append(bar);
  }
  li.append(frame, text);
  return li;
}

function masteryAriaLabel(
  slice: MasterySlice | undefined,
  bookName: string
): string {
  if (!slice) return `${bookName}, not tested yet`;
  const hits = [
    slice.exactCount > 0 ? `${slice.exactCount} exact` : null,
    slice.nearCount > 0 ? `${slice.nearCount} near` : null,
  ].filter((p): p is string => p != null);
  const parts = [
    bookName,
    `${slice.rounds} round${slice.rounds === 1 ? "" : "s"}`,
    formatMiss(slice.medianDistance),
    ...hits,
  ];
  return parts.join(", ");
}

function fillMasteryDetail(
  detail: HTMLElement,
  slice: MasterySlice | undefined,
  bookName: string | null
): void {
  detail.replaceChildren();
  if (!bookName) {
    detail.append(
      el("span", { class: "mastery-map-detail-meta", text: "No books measured yet." })
    );
    return;
  }
  detail.append(el("span", { class: "mastery-map-detail-name", text: bookName }));
  if (!slice) {
    detail.append(
      el("span", { class: "mastery-map-detail-meta", text: "Not tested yet" })
    );
    return;
  }
  const hits = [
    slice.exactCount > 0 ? `${slice.exactCount} exact` : null,
    slice.nearCount > 0 ? `${slice.nearCount} near` : null,
  ].filter((p): p is string => p != null);
  const meta = [
    formatMiss(slice.medianDistance),
    `${slice.rounds} round${slice.rounds === 1 ? "" : "s"}`,
    ...hits,
  ].join(" · ");
  detail.append(el("span", { class: "mastery-map-detail-meta", text: meta }));
}

function masteryMapChevron(): HTMLElement {
  const chevron = el("span", {
    class: "mastery-map-detail-chevron",
    "aria-hidden": "true",
  });
  chevron.innerHTML = `<svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
  return chevron;
}

/** Default selection: weakest measured book, else first book with any data. */
function defaultMasteryFocus(mastery: MasteryReport): string | null {
  const measured = Object.values(mastery.bookHeat);
  if (!measured.length) return null;
  measured.sort((a, b) => b.medianDistance - a.medianDistance);
  return measured[0]!.id;
}

function makeMasterySection(
  mastery: MasteryReport,
  haptic?: () => void
): {
  map: HTMLElement;
  focus: HTMLElement;
} {
  const map = el("div", { class: "mastery-map" });
  map.append(
    el("h2", { class: "achievements-section-label", text: "Canon map" })
  );

  const measured = Object.keys(mastery.bookHeat).length;
  if (measured === 0) {
    map.append(
      el("p", {
        class: "mastery-map-hint",
        text: "Play a few more rounds — tested books will warm on the rail.",
      })
    );
  }

  const rail = el("div", {
    class: "mastery-map-rail",
    role: "group",
    "aria-label": "Canon mastery by book",
  });

  let selected = defaultMasteryFocus(mastery);
  /** Fixed ranking — no Farther/Closer tabs; miss-distance list only. */
  const listMode = "farther" as const;
  const mapButtons: HTMLButtonElement[] = [];
  const listButtons: HTMLButtonElement[] = [];
  const pickerButtons: HTMLButtonElement[] = [];
  const segments = bookSegments();

  const picker = el("div", { class: "mastery-map-picker" });
  const detailBtn = el("button", {
    class: "mastery-map-detail",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "mastery-map-book-picker",
    "aria-label": "Choose a book on the canon map",
  });
  const detailMain = el("span", {
    class: "mastery-map-detail-main",
    "aria-live": "polite",
  });
  detailBtn.append(detailMain, masteryMapChevron());
  const pickerList = el("ul", {
    class: "mastery-map-picker-list",
    id: "mastery-map-book-picker",
    role: "listbox",
    "aria-label": "Books",
  });
  pickerList.hidden = true;
  picker.append(detailBtn, pickerList);

  let pickerOpen = false;
  const setPickerOpen = (open: boolean) => {
    pickerOpen = open;
    detailBtn.setAttribute("aria-expanded", open ? "true" : "false");
    detailBtn.classList.toggle("is-expanded", open);
    pickerList.hidden = !open;
    if (open) {
      const active = pickerButtons.find((b) => b.dataset.osis === selected);
      // After layout, center the current book in the picker viewport.
      requestAnimationFrame(() => {
        active?.scrollIntoView({ block: "center", inline: "nearest" });
      });
    }
  };

  detailBtn.addEventListener("click", () => {
    haptic?.();
    setPickerOpen(!pickerOpen);
  });

  const syncPickerSelection = () => {
    for (const b of pickerButtons) {
      const on = b.dataset.osis === selected;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    }
  };

  const selectAtClientX = (clientX: number, withHaptic: boolean) => {
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return;
    const seg = bookSegmentAtT((clientX - rect.left) / rect.width, segments);
    if (!seg || seg.osis === selected) return;
    if (withHaptic) haptic?.();
    if (pickerOpen) setPickerOpen(false);
    selectBook(seg.osis, seg.name, mastery.bookHeat[seg.osis]);
  };

  let scrubbing = false;
  let suppressClick = false;

  rail.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    scrubbing = true;
    suppressClick = true;
    rail.classList.add("is-scrubbing");
    rail.setPointerCapture(e.pointerId);
    selectAtClientX(e.clientX, true);
  });

  rail.addEventListener("pointermove", (e) => {
    if (!scrubbing) return;
    selectAtClientX(e.clientX, true);
  });

  const endScrub = (e: PointerEvent) => {
    if (!scrubbing) return;
    scrubbing = false;
    rail.classList.remove("is-scrubbing");
    if (rail.hasPointerCapture(e.pointerId)) {
      rail.releasePointerCapture(e.pointerId);
    }
    // Click follows pointerup in the same turn; clear afterward.
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
  };

  rail.addEventListener("pointerup", endScrub);
  rail.addEventListener("pointercancel", endScrub);

  for (const segment of segments) {
    const slice = mastery.bookHeat[segment.osis];
    const btn = el("button", {
      class: "mastery-map-book",
      type: "button",
      "data-osis": segment.osis,
      "aria-label": masteryAriaLabel(slice, segment.name),
      "aria-pressed": selected === segment.osis ? "true" : "false",
      title: segment.name,
    });
    const span = Math.max(0, segment.t1 - segment.t0);
    btn.style.left = `${segment.t0 * 100}%`;
    btn.style.width = `${span * 100}%`;
    if (slice) btn.dataset.heat = String(slice.medianDistance);
    btn.style.background = masteryHeatColor(
      slice ? slice.medianDistance : null
    );
    if (selected === segment.osis) btn.classList.add("is-selected");
    btn.addEventListener("click", (e) => {
      // Pointer scrub already selected; keep click for keyboard activation.
      if (suppressClick) {
        e.preventDefault();
        suppressClick = false;
        return;
      }
      haptic?.();
      selectBook(segment.osis, segment.name, slice);
    });
    mapButtons.push(btn);
    rail.append(btn);

    const opt = el("li", { class: "mastery-map-picker-row", role: "none" });
    const optBtn = el("button", {
      class: "mastery-map-picker-btn",
      type: "button",
      role: "option",
      "data-osis": segment.osis,
      "aria-selected": selected === segment.osis ? "true" : "false",
    });
    if (selected === segment.osis) optBtn.classList.add("is-selected");
    const miss = slice
      ? formatMiss(slice.medianDistance)
      : "Not tested yet";
    optBtn.append(
      el("span", { class: "mastery-map-picker-name", text: segment.name }),
      el("span", { class: "mastery-map-picker-meta", text: miss })
    );
    optBtn.addEventListener("click", () => {
      haptic?.();
      selectBook(segment.osis, segment.name, slice);
      setPickerOpen(false);
    });
    pickerButtons.push(optBtn);
    opt.append(optBtn);
    pickerList.append(opt);
  }

  const seam = el("span", { class: "mastery-map-seam", "aria-hidden": "true" });
  seam.style.left = `${testamentSeamT() * 100}%`;
  rail.append(seam);

  map.append(rail);
  map.append(
    el("div", { class: "mastery-map-ends" }, [
      el("span", { text: "Genesis" }),
      el("span", { text: "Revelation" }),
    ])
  );

  const focusSeg = segments.find((s) => s.osis === selected);
  const focusSlice = selected ? mastery.bookHeat[selected] : undefined;
  fillMasteryDetail(detailMain, focusSlice, focusSeg?.name ?? null);
  map.append(picker);
  map.append(
    el("div", {
      class: "mastery-map-legend",
      "aria-hidden": "true",
    }, [
      el("span", { text: "Closer" }),
      el("span", { class: "mastery-map-legend-ramp" }),
      el("span", { text: "Farther" }),
    ])
  );

  // Books + genres by miss distance — no Farther/Coverage/Closer tabs
  const focus = el("div", { class: "mastery-focus-block" });
  const listsHost = el("div", { class: "mastery-lists" });

  const catalog = bookSegments().map((s) => ({
    osis: s.osis,
    name: s.name,
  }));

  const MASTERY_PREVIEW = 4;
  let booksExpanded = false;
  let genresExpanded = false;

  /** Highlight matching list rows only — never scroll (map selection must stay put). */
  const syncListSelection = () => {
    for (const b of listButtons) {
      const on = b.dataset.osis === selected;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
  };

  const selectBook = (
    osis: string,
    name: string,
    slice: MasterySlice | undefined
  ) => {
    selected = osis;
    for (const b of mapButtons) {
      const on = b.dataset.osis === osis;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
    fillMasteryDetail(detailMain, slice, name);
    syncPickerSelection();
    syncListSelection();
  };

  const renderLists = () => {
    listsHost.replaceChildren();
    listButtons.length = 0;

    const genres = genresForFocusMode(mastery, listMode);
    appendCollapsibleList({
      title: "Genres",
      items: genres,
      expanded: genresExpanded,
      empty: "Play across more of the canon to measure genres.",
      onToggle: () => {
        genresExpanded = !genresExpanded;
        haptic?.();
        renderLists();
      },
      build: (slice) => buildGenreList(slice),
    });

    const books = booksForFocusMode(mastery, listMode, catalog);
    appendCollapsibleList({
      title: "Books",
      items: books,
      expanded: booksExpanded,
      empty: "Finish a few rounds to see where misses run farther.",
      onToggle: () => {
        booksExpanded = !booksExpanded;
        haptic?.();
        renderLists();
      },
      build: (slice) => buildBookList(slice),
    });
  };

  function appendCollapsibleList(opts: {
    title: string;
    items: MasterySlice[];
    expanded: boolean;
    empty: string;
    onToggle: () => void;
    build: (items: MasterySlice[]) => HTMLElement;
  }): void {
    const needsToggle = opts.items.length > MASTERY_PREVIEW;

    if (needsToggle) {
      const header = el("button", {
        class: "mastery-list-header",
        type: "button",
        "aria-expanded": opts.expanded ? "true" : "false",
      });
      if (opts.expanded) header.classList.add("is-expanded");
      const chevron = el("span", {
        class: "mastery-list-chevron",
        "aria-hidden": "true",
      });
      chevron.innerHTML = `<svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
      header.append(
        el("span", { class: "mastery-list-header-label", text: opts.title }),
        chevron
      );
      header.addEventListener("click", opts.onToggle);
      listsHost.append(header);
    } else {
      listsHost.append(
        el("h2", { class: "achievements-section-label", text: opts.title })
      );
    }

    if (!opts.items.length) {
      listsHost.append(
        el("p", { class: "achievements-sparse", text: opts.empty })
      );
      return;
    }

    const visible =
      needsToggle && !opts.expanded
        ? opts.items.slice(0, MASTERY_PREVIEW)
        : opts.items;
    listsHost.append(opts.build(visible));
  }

  function buildBookList(books: MasterySlice[]): HTMLElement {
    const ul = el("ul", {
      class: "mastery-list",
      "aria-label": "Book mastery",
    });
    for (const s of books) {
      const row = el("li", { class: "mastery-row" });
      const slice = s.rounds > 0 ? s : undefined;
      const btn = el("button", {
        class: "mastery-row-btn",
        type: "button",
        "data-osis": s.id,
        "aria-pressed": selected === s.id ? "true" : "false",
      });
      if (selected === s.id) btn.classList.add("is-selected");
      const count =
        s.rounds > 0
          ? ` · ${s.rounds} round${s.rounds === 1 ? "" : "s"}`
          : "";
      const name = el("span", { class: "mastery-name", text: s.label }, [
        el("span", { class: "mastery-count", text: count }),
      ]);
      btn.append(
        el("div", { class: "mastery-row-main" }, [
          name,
          el("span", {
            class: "mastery-miss",
            text: masteryFocusMetric(s, listMode),
          }),
        ])
      );
      btn.addEventListener("click", () => {
        haptic?.();
        selectBook(s.id, s.label, slice);
      });
      listButtons.push(btn);
      row.append(btn);
      ul.append(row);
    }
    return ul;
  }

  function buildGenreList(genres: MasterySlice[]): HTMLElement {
    const ul = el("ul", {
      class: "mastery-list",
      "aria-label": "Genre mastery",
    });
    for (const s of genres) {
      const count =
        s.rounds > 0
          ? ` · ${s.rounds} round${s.rounds === 1 ? "" : "s"}`
          : "";
      const name = el("span", { class: "mastery-name", text: s.label }, [
        el("span", { class: "mastery-count", text: count }),
      ]);
      const row = el("li", { class: "mastery-row" }, [
        el("div", { class: "mastery-row-main" }, [
          name,
          el("span", {
            class: "mastery-miss",
            text: masteryFocusMetric(s, listMode),
          }),
        ]),
      ]);
      ul.append(row);
    }
    return ul;
  }

  focus.append(listsHost);
  renderLists();

  return { map, focus };
}

