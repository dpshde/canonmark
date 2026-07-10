import "./styles.css";
import type { PoolItem } from "./lib/daily";
import type { PoolFile } from "./lib/daily";
import {
  startDailyRound,
  startEndlessRound,
  takeHint,
  confirmGuess,
  shareForRound,
  hintQuadrantLabel,
  currentAppState,
  type RoundData,
  type TextBundle,
} from "./lib/game";
import { CanonStrip } from "./lib/strip";
import { formatVerseLabel } from "./lib/books";
import { hintMultiplier } from "./lib/scoring";
import type { ZoomPreset } from "./lib/axis";
import { shareText } from "./lib/share";
import { parseGuessText } from "./lib/guess-parse";

const app = document.querySelector<HTMLDivElement>("#app")!;

let pool: PoolItem[] = [];
let texts: TextBundle = { verses: {}, paragraphs: {} };
let round: RoundData | null = null;
let strip: CanonStrip | null = null;
let provisionalGuess: number | null = null;
let chromeRo: ResizeObserver | null = null;
/** Active zoom chip; cleared when the player free-zooms with wheel/gesture. */
let activeZoom: ZoomPreset | null = null;
/** True while the guess field has focus — don't clobber in-progress typing. */
let guessInputFocused = false;

async function loadData(): Promise<void> {
  const base = import.meta.env.BASE_URL || "./";
  const [poolRes, versesRes, paraRes] = await Promise.all([
    fetch(`${base}data/pool.json`),
    fetch(`${base}data/verses.json`),
    fetch(`${base}data/paragraphs.json`),
  ]);
  if (!poolRes.ok || !versesRes.ok || !paraRes.ok) {
    throw new Error("Failed to load game data");
  }
  const poolFile = (await poolRes.json()) as PoolFile;
  pool = poolFile.items;
  texts = {
    verses: (await versesRes.json()) as Record<string, string>,
    paragraphs: (await paraRes.json()) as TextBundle["paragraphs"],
  };
}

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

function makeTimelineMark(): HTMLElement {
  const wrap = el("div", { class: "home-mark", "aria-hidden": "true" });
  wrap.innerHTML = `<svg viewBox="0 0 40 40" fill="none">
    <line class="rail-line" x1="6" y1="20" x2="34" y2="20"/>
    <circle class="marker-dot" cx="14" cy="20" r="3"/>
    <circle class="marker-true" cx="26" cy="20" r="3"/>
  </svg>`;
  return wrap;
}

function renderHome(): void {
  app.innerHTML = "";
  const state = currentAppState();
  const screen = el("div", { class: "screen home active", id: "screen-home" });
  const panel = el("div", { class: "home-panel" });

  panel.append(
    makeTimelineMark(),
    el("h1", { text: "Canonmark" }),
    el("p", {
      class: "tagline",
      text: "Mark where the verse lives in Scripture.",
    })
  );

  if (state.streak > 0) {
    panel.append(
      el("p", {
        class: "streak",
        text: `Streak ${state.streak} · Best ${state.bestStreak}`,
      })
    );
  }

  panel.append(
    el("div", { class: "btn-row" }, [
      (() => {
        const b = el("button", {
          class: "btn-primary",
          id: "btn-daily",
          type: "button",
          text: "Daily",
        });
        b.addEventListener("click", () => startMode("daily"));
        return b;
      })(),
      (() => {
        const b = el("button", {
          class: "btn-secondary",
          id: "btn-endless",
          type: "button",
          text: "Practice",
        });
        b.addEventListener("click", () => startMode("endless"));
        return b;
      })(),
    ])
  );

  screen.append(panel);
  app.append(screen);
}

function startMode(mode: "daily" | "endless"): void {
  chromeRo?.disconnect();
  chromeRo = null;
  strip?.destroy();
  strip = null;
  activeZoom = null;
  round =
    mode === "daily"
      ? startDailyRound(pool, texts)
      : startEndlessRound(pool, texts);
  provisionalGuess = round.guessVerseIndex;
  renderPlay();
  requestAnimationFrame(() => {
    if (!strip || !round) return;
    if (round.phase === "revealed" && round.guessVerseIndex != null) {
      strip.setProvisionalGuess(round.guessVerseIndex);
      strip.lockGuess();
      strip.reveal(round.poolItem.verseIndex);
    }
  });
}

function renderPlay(): void {
  if (!round) return;
  app.innerHTML = "";
  const screen = el("div", {
    class: "screen play active",
    id: "screen-play",
  });

  const board = el("div", {
    class: "board-wrap",
    id: "strip-wrap",
  });
  const canvas = el("canvas", {
    id: "canon-strip",
    "aria-label": "Canon timeline",
  });
  board.append(canvas);
  screen.append(board);

  const hud = el("div", { class: "hud" });

  const top = el("div", { class: "top-bar" });
  const back = el("button", {
    class: "btn-ghost",
    type: "button",
    id: "btn-home",
    text: "Home",
  });
  back.addEventListener("click", () => {
    chromeRo?.disconnect();
    chromeRo = null;
    strip?.destroy();
    strip = null;
    round = null;
    renderHome();
  });
  const modeLabel =
    round.mode === "daily" && round.puzzleNumber != null
      ? `Daily #${round.puzzleNumber}`
      : "Practice";
  /* Map zooms sit with nav chrome while placing — hide on result to reduce noise */
  if (round.phase === "playing") {
    top.append(
      back,
      makeZoomBar(),
      el("span", { class: "mode-label", text: modeLabel })
    );
  } else {
    top.append(back, el("span", { class: "mode-label", text: modeLabel }));
  }
  hud.append(top);

  /* Verse band — same horizontal measure as the dock */
  const verseBand = el("div", { class: "verse-band" });
  const card = el("div", { class: "card", id: "verse-card" });
  card.append(el("p", { class: "verse", id: "verse-text", text: round.verseText }));
  verseBand.append(card);
  hud.append(verseBand);

  /* Transparent mid — hits pass through to the board */
  hud.append(el("div", { class: "hud-mid", "aria-hidden": "true" }));

  const dock = el("div", { class: "dock" });

  /* Hints sit under the timeline, above readout / actions */
  const hintPanel = makeHintPanel(round);
  if (hintPanel) dock.append(hintPanel);

  if (round.phase === "playing") {
    dock.append(makeGuessInput());

    const actions = el("div", { class: "actions" });
    const hintBtn = el("button", {
      class: "btn-secondary",
      type: "button",
      id: "btn-hint",
      text:
        round.hintStep >= 3
          ? `×${hintMultiplier(round.hintStep)}`
          : `Hint · ×${hintMultiplier(round.hintStep)}`,
    });
    if (round.hintStep >= 3) hintBtn.disabled = true;
    hintBtn.setAttribute(
      "aria-label",
      round.hintStep >= 3
        ? `All hints used, multiplier ×${hintMultiplier(round.hintStep)}`
        : `Take a hint, current multiplier ×${hintMultiplier(round.hintStep)}`
    );
    hintBtn.addEventListener("click", () => {
      if (!round || round.hintStep >= 3) return;
      round = takeHint(round);
      renderPlay();
    });

    const confirm = el("button", {
      class: "btn-primary",
      type: "button",
      id: "btn-confirm",
      text: "Confirm",
    });
    confirm.disabled = provisionalGuess == null;
    confirm.addEventListener("click", () => {
      if (!round || provisionalGuess == null) return;
      // Prefer whatever is currently typed if it parses
      const input = document.querySelector<HTMLInputElement>("#guess-input");
      if (input?.value.trim()) {
        const parsed = parseGuessText(input.value);
        if (parsed.ok) {
          provisionalGuess = parsed.verseIndex;
          strip?.setProvisionalGuess(parsed.verseIndex);
        }
      }
      if (provisionalGuess == null) return;
      const locked = strip?.lockGuess() ?? provisionalGuess;
      const { round: next } = confirmGuess(round, locked);
      round = next;
      strip?.reveal(round.poolItem.verseIndex);
      renderPlay();
    });

    actions.append(hintBtn, confirm);
    dock.append(actions);
  }

  if (round.phase === "revealed" && round.result) {
    dock.append(makeResultPanel(round));
  }

  hud.append(dock);
  screen.append(hud);
  app.append(screen);

  strip = new CanonStrip(canvas);
  strip.setOnGuessChange((ch) => {
    provisionalGuess = ch;
    syncConfirmEnabled();
    syncGuessInputFromMarker();
  });
  if (provisionalGuess != null) {
    strip.setProvisionalGuess(provisionalGuess);
  }
  if (round.phase === "revealed" && round.guessVerseIndex != null) {
    strip.setProvisionalGuess(round.guessVerseIndex);
    strip.lockGuess();
    strip.reveal(round.poolItem.verseIndex);
  }

  /* Keep the rail centered in the free band as chrome resizes */
  chromeRo?.disconnect();
  chromeRo = new ResizeObserver(() => syncChromeInsets());
  chromeRo.observe(hud);
  chromeRo.observe(board);
  requestAnimationFrame(() => syncChromeInsets());
}

/** Measure HUD chrome and offset the canvas rail into the free board band. */
function syncChromeInsets(): void {
  if (!strip) return;
  const board = document.querySelector(".board-wrap");
  const topBar = document.querySelector(".top-bar");
  const verseBand = document.querySelector(".verse-band");
  const dock = document.querySelector(".dock");
  if (!board) return;

  const br = board.getBoundingClientRect();
  const topEdge = verseBand
    ? verseBand.getBoundingClientRect().bottom
    : topBar
      ? topBar.getBoundingClientRect().bottom
      : br.top;
  const bottomEdge = dock ? dock.getBoundingClientRect().top : br.bottom;

  /* Extra room so marker labels (~24px) clear the chrome gradients */
  const topGap = 16;
  const bottomGap = 16;
  strip.setChromeInsets({
    top: Math.max(0, topEdge - br.top + topGap),
    bottom: Math.max(0, br.bottom - bottomEdge + bottomGap),
    start: 0,
    end: 0,
  });
}

function makeGuessInput(): HTMLElement {
  const wrap = el("div", { class: "guess-field", id: "guess-readout" });
  const input = el("input", {
    class: "guess-input",
    id: "guess-input",
    type: "text",
    inputmode: "text",
    autocomplete: "off",
    autocorrect: "off",
    autocapitalize: "words",
    spellcheck: "false",
    enterkeyhint: "done",
    "aria-label": "Your guess — type a Bible reference or tap the timeline",
    placeholder: "Type a reference or tap the timeline",
  }) as HTMLInputElement;

  if (provisionalGuess != null) {
    input.value = formatVerseLabel(provisionalGuess);
    wrap.classList.add("is-valid");
  }

  const setValidity = (state: "empty" | "valid" | "invalid"): void => {
    wrap.classList.toggle("is-valid", state === "valid");
    wrap.classList.toggle("is-invalid", state === "invalid");
  };

  const applyFromInput = (commitLabel: boolean): void => {
    const raw = input.value;
    const parsed = parseGuessText(raw);
    if (parsed.ok) {
      provisionalGuess = parsed.verseIndex;
      strip?.setProvisionalGuess(parsed.verseIndex);
      if (commitLabel && !guessInputFocused) {
        input.value = parsed.label;
      } else if (commitLabel && document.activeElement !== input) {
        input.value = parsed.label;
      }
      setValidity("valid");
      syncConfirmEnabled();
      return;
    }
    if (parsed.reason === "empty") {
      setValidity("empty");
      // Keep timeline marker; empty field is fine while still deciding
      syncConfirmEnabled();
      return;
    }
    setValidity("invalid");
    syncConfirmEnabled();
  };

  input.addEventListener("focus", () => {
    guessInputFocused = true;
    // Select all so a re-tap replaces cleanly
    requestAnimationFrame(() => input.select());
  });
  input.addEventListener("blur", () => {
    guessInputFocused = false;
    applyFromInput(true);
    // Normalize display to canonical label when valid
    if (provisionalGuess != null && parseGuessText(input.value).ok) {
      input.value = formatVerseLabel(provisionalGuess);
      setValidity("valid");
    }
  });
  input.addEventListener("input", () => applyFromInput(false));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFromInput(true);
      if (provisionalGuess != null) {
        input.blur();
        document.querySelector<HTMLButtonElement>("#btn-confirm")?.focus();
      }
    }
  });

  wrap.append(input);
  return wrap;
}

function syncConfirmEnabled(): void {
  const conf = document.querySelector<HTMLButtonElement>("#btn-confirm");
  if (conf) conf.disabled = provisionalGuess == null;
}

/** Push marker placement into the text field (unless the user is typing). */
function syncGuessInputFromMarker(): void {
  const input = document.querySelector<HTMLInputElement>("#guess-input");
  const wrap = document.querySelector("#guess-readout");
  if (!input || !wrap) return;
  if (guessInputFocused) return;
  if (provisionalGuess == null) {
    input.value = "";
    wrap.classList.remove("is-valid", "is-invalid");
    return;
  }
  input.value = formatVerseLabel(provisionalGuess);
  wrap.classList.add("is-valid");
  wrap.classList.remove("is-invalid");
}

/**
 * Result dock — score is the hero; timeline already carries guess/true labels.
 * One meta line, one action row. No repeated refs, no base-point jargon.
 */
function makeResultPanel(round: RoundData): HTMLElement {
  const r = round.result!;
  const panel = el("div", { class: "result-panel", id: "result-card" });

  const distLabel =
    r.distance === 0
      ? "Exact"
      : r.distance === 1
        ? "1 verse off"
        : `${r.distance} verses off`;

  panel.append(
    el("p", { class: "score-line", id: "score-total" }, [
      document.createTextNode(String(r.total)),
      el("span", { class: "pts-unit", text: "pts" }),
    ]),
    el("p", {
      class: "score-meta",
      id: "true-ref",
      text: `${distLabel} · ×${r.multiplier}`,
    })
  );

  const actions = el("div", { class: "result-actions" });
  const shareTextBody = shareForRound(round);
  if (shareTextBody) {
    const shareBtn = el("button", {
      class:
        round.mode === "daily" ? "btn-primary" : "btn-secondary",
      type: "button",
      id: "btn-share",
      text: "Share",
    });
    shareBtn.addEventListener("click", async () => {
      try {
        const how = await shareText(shareTextBody);
        shareBtn.textContent = how === "shared" ? "Shared" : "Copied";
        window.setTimeout(() => {
          shareBtn.textContent = "Share";
        }, 1600);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        let box = document.querySelector("#share-box") as HTMLElement | null;
        if (!box) {
          box = el("div", { class: "share-box", id: "share-box" });
          box.textContent = shareTextBody;
          panel.insertBefore(box, actions);
        }
        shareBtn.textContent = "Select text above";
      }
    });
    actions.append(shareBtn);
  }

  if (round.mode === "endless") {
    const again = el("button", {
      class: "btn-primary",
      type: "button",
      id: "btn-again",
      text: "Next",
    });
    again.addEventListener("click", () => startMode("endless"));
    actions.append(again);
  }

  if (actions.childNodes.length === 1) {
    actions.classList.add("result-actions--solo");
  }
  if (actions.childNodes.length) panel.append(actions);
  return panel;
}

/** Surrounding paragraph + testament-half hints — rendered below the rail. */
function makeHintPanel(round: RoundData): HTMLElement | null {
  if (round.hintStep < 2) return null;

  const panel = el("div", {
    class: "hint-panel",
    id: "hint-panel",
  });

  if (round.paragraph) {
    const p = el("p", { class: "paragraph", id: "paragraph-hint" });
    for (const v of round.paragraph.verses) {
      const span = el("span");
      if (v.v === round.poolItem.verse) {
        span.className = "focus";
      }
      span.textContent = `${v.t} `;
      p.append(span);
    }
    panel.append(p);
  }

  if (round.hintStep >= 3) {
    panel.append(
      el("p", {
        class: "quadrant",
        id: "quadrant-hint",
        text: hintQuadrantLabel(round),
      })
    );
  }

  return panel;
}

const ZOOM_PRESETS: { id: ZoomPreset; label: string; title: string }[] = [
  {
    id: "ot",
    label: "OT",
    title: "Old Testament — tap again for full canon",
  },
  {
    id: "nt",
    label: "NT",
    title: "New Testament — tap again for full canon",
  },
  {
    id: "book",
    label: "Book",
    title: "Book under marker — tap again for full canon",
  },
];

function syncZoomBarUI(bar: HTMLElement): void {
  bar.querySelectorAll(".zoom-link").forEach((node) => {
    const b = node as HTMLButtonElement;
    const id = b.id.replace(/^zoom-/, "") as ZoomPreset;
    const on = activeZoom === id;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function applyZoomSelection(next: ZoomPreset | null): void {
  // OT and NT are mutually exclusive; Book is exclusive with both.
  // Re-selecting the active preset toggles zoom completely off.
  if (next != null && activeZoom === next) {
    activeZoom = null;
    strip?.clearZoom();
    return;
  }
  activeZoom = next;
  if (next == null) {
    strip?.clearZoom();
    return;
  }
  strip?.setZoomPreset(next, provisionalGuess ?? undefined);
}

function makeZoomBar(): HTMLElement {
  const bar = el("div", {
    class: "zoom-bar",
    role: "group",
    "aria-label": "Timeline zoom",
  });
  ZOOM_PRESETS.forEach((p, i) => {
    if (i > 0) {
      bar.append(el("span", { class: "zoom-sep", "aria-hidden": "true", text: "·" }));
    }
    const btn = el("button", {
      class: `zoom-link${activeZoom === p.id ? " is-active" : ""}`,
      type: "button",
      id: `zoom-${p.id}`,
      text: p.label,
      title: p.title,
      "aria-pressed": activeZoom === p.id ? "true" : "false",
    });
    btn.addEventListener("click", () => {
      applyZoomSelection(p.id);
      syncZoomBarUI(bar);
    });
    bar.append(btn);
  });
  return bar;
}

declare global {
  interface Window {
    __canonmark?: {
      placeGuess: (verseIndex: number) => void;
      confirm: () => void;
      takeHint: () => void;
      getRound: () => RoundData | null;
      startDaily: () => void;
      startEndless: () => void;
      zoom: (preset: ZoomPreset | null) => void;
    };
  }
}

function installDebugApi(): void {
  window.__canonmark = {
    placeGuess(verseIndex: number) {
      provisionalGuess = verseIndex;
      strip?.setProvisionalGuess(verseIndex);
      syncConfirmEnabled();
      syncGuessInputFromMarker();
    },
    confirm() {
      document.querySelector<HTMLButtonElement>("#btn-confirm")?.click();
    },
    takeHint() {
      document.querySelector<HTMLButtonElement>("#btn-hint")?.click();
    },
    getRound() {
      return round;
    },
    startDaily() {
      startMode("daily");
    },
    startEndless() {
      startMode("endless");
    },
    zoom(preset: ZoomPreset | null) {
      // null = clear; same preset twice via API always sets (use null to off)
      if (preset == null) {
        activeZoom = null;
        strip?.clearZoom();
      } else {
        activeZoom = null; // force set even if already active
        applyZoomSelection(preset);
      }
      const bar = document.querySelector(".zoom-bar");
      if (bar) syncZoomBarUI(bar as HTMLElement);
    },
  };
}

async function main(): Promise<void> {
  try {
    await loadData();
  } catch (e) {
    app.innerHTML = `<div class="home active" style="padding:2rem"><p>Failed to load data. Run <code>npm run build:data</code>.</p><pre>${String(e)}</pre></div>`;
    console.error(e);
    return;
  }
  installDebugApi();
  renderHome();
}

main();
