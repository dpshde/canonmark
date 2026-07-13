# Achievements Deck UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the scroll-wall achievements screen with a TikTok-style vertical snap deck (story + play) plus full-data sheets (complete ledger), wired to live `mastery` / `achievements` / `storage` — keeping Versemark design tokens and never preview-only data.

**Architecture:** Keep domain logic in `src/lib/*`. New presentation layer: `renderAchievements()` becomes a thin orchestrator over (1) a snap **deck** of cards, (2) full-screen **sheets** for complete catalogs, (3) an **Index** card as post-story home base. Pure view-model builders live in new modules so UI stays dumb and testable. No backend. State remains local `AppState`.

**Tech Stack:** TypeScript, Vite, vanilla DOM (`main.ts` patterns), existing CSS tokens in `src/styles.css` + `DESIGN.md`, Vitest, existing `computeMastery`, `listAchievements`, `nextClosestAchievement`, `loadState`.

**Reference mockup (behavior, not pixels to copy blindly):**  
`artifacts/versemark-achievements-ui-deck.html` (also `~/Downloads/versemark-achievements-ui.html` on laptop).

**Non-goals (YAGNI this pass):** Practice paywall / Stripe; native IAP; new durable counters; redesigning play mode; confetti / streak-fire.

---

## Product rules (locked)

1. **Deck = story + interaction.** One idea per full viewport card. Snap vertical.
2. **Sheets = complete data.** Every metric, all 66 books, every mark path — no “top 3 only” without a path to full list.
3. **Materials:** Charter stack, terracotta accent, square corners, hairline borders, no SaaS cards, no kitsch (see `DESIGN.md`).
4. **Language:** Prefer **Unaided** in UI chrome for `sight` ladder (exact, no hints). Keep achievement titles from catalog when showing formal marks.
5. **Lifelong marks:** Immediate “Next checkpoint” + trail of key nodes; full ladders in sheets.
6. **Index** after the story: jump to cards + open full-data sheets.
7. **Durability:** Only display stats derivable from durable sources (`docs/achievements.md`). Don’t invent dimensions rollups can’t support.

---

## Current baseline (repo)

| Piece | Location |
|-------|----------|
| Achievements UI | `src/main.ts` → `renderAchievements()` (~L374+) |
| Mastery / books heat / trends | `src/lib/mastery.ts` |
| Ladders + list/next | `src/lib/achievements.ts` (`exact`, `sight`, `near`, `chapter`, `rounds`, `streak`, `daily`, `clean`, `unprompted`) |
| State | `src/lib/storage.ts` |
| Styles | `src/styles.css` (achievements + mastery blocks) |
| Design system | `DESIGN.md` |
| Achievement durability rules | `docs/achievements.md` |
| Tests | `tests/achievements.test.ts`, `tests/mastery.test.ts`, `tests/rollups.test.ts` |

Live screen today: Lifetime summary grid → canon map + focus lists → Next → full unlocks log → distance trend. That becomes **data sources for deck/sheets**, not the primary chrome.

---

## Target IA

### Deck cards (order)

| # | Card id | Purpose | Primary data |
|---|---------|---------|----------------|
| 0 | `you` | Pulse: one claim + big number + chips | mastery + lifetime-derived rates |
| 1 | `map` | Interactive heat rail | `mastery.bookHeat` + `bookSegments()` |
| 2 | `far` | Pick a weak book (optional train bias) | books sorted by miss |
| 3 | `close` | Strengths | books with low miss |
| 4 | `next` | Next checkpoint face | `nextClosestAchievement` |
| 5 | `marks-path` | Lifelong trail by ladder | ladder thresholds + progress |
| 6 | `train` | CTAs → existing Daily / Practice | navigation only |
| 7 | `index` | TOC + full-data entry | static structure + live metas |

Empty state: if `mastery.totalRounds === 0`, deck collapses to **empty pulse** + **index** with “Start Daily” (reuse home actions).

### Full-data sheets

| Sheet id | Contents |
|----------|----------|
| `stats` | Overall table + **genre select** + **book select** with full detail panels |
| `books` | All 66 books (optional filter: far / close / untested) |
| `marks` | Full ladder for one path |
| `marks-all` | Every ladder, complete |
| `earned` | All passed unlocks |
| `genres` | All 6 genres with aggregates |

Every deck highlight that shows a subset must expose a control opening the matching sheet.

---

## File plan

| Action | Path |
|--------|------|
| Create | `src/lib/achievements-deck-model.ts` — pure view-model from `AppState` |
| Create | `src/lib/achievements-stats.ts` — overall / genre / book stat builders |
| Create | `src/ui/achievements-deck.ts` — deck + sheet DOM (or keep under `main.ts` if preferred; prefer split) |
| Modify | `src/main.ts` — `renderAchievements()` calls new UI; wire Daily/Practice exits |
| Modify | `src/styles.css` — deck, cards, dots, sheets, pickers, trail (reuse tokens) |
| Create | `tests/achievements-deck-model.test.ts` |
| Create | `tests/achievements-stats.test.ts` |
| Update | `DESIGN.md` — secondary surface: deck + sheets (short section) |
| Update | `docs/achievements.md` — UI consumption notes (optional short) |
| Keep | Mock HTML out of prod bundle; optional `docs/plans/` + `artifacts/` only |

---

## View-model contracts (implement exactly)

### `buildDeckModel(state: AppState): DeckModel`

```ts
export type DeckCardId =
  | "you" | "map" | "far" | "close" | "next" | "marks-path" | "train" | "index";

export interface DeckModel {
  empty: boolean;
  /** Ordered card ids to render */
  cards: DeckCardId[];
  you: YouCardModel;
  map: MapCardModel;
  far: BookPickModel;
  close: BookPickModel;
  next: NextMarkModel | null;
  marksPath: MarksPathModel;
  train: TrainCardModel;
  index: IndexModel;
}
```

**YouCardModel**

- `headline: string` — short claim (derive from rates: e.g. high chapter / low exact → “Books: getting it. Verses: still rare.” Keep templates in one function; no LLM.)
- `heroValue: string` — e.g. exact rate `"41%"`
- `heroUnit: string` — `"exact · from your Dailies & Practice"` (honest about sources)
- `chips: { label: string; value: string }[]` — unaided rate, books tested `n/66`, median miss
- `stageLabel: string` — simple stage from rounds/coverage (define thresholds in model; test them)

**MapCardModel**

- `segments: { osis: string; name: string; t0: number; t1: number; heat: string | null; metric: string; rounds: number }[]`
- Use `bookSegments()` + `mastery.bookHeat` + `masteryHeatColor` / `formatMiss`

**BookPickModel**

- `rows: { osis: string; name: string; metric: string; heat: string }[]` — **full sorted list available to sheets**; deck may show top 3 **plus** “Full list” sheet open
- `sheetFilter: "far" | "close"`

**NextMarkModel**

- From `nextClosestAchievement(listAchievements(state))`
- `id, title, description, current, threshold, progress, dropCap, metal`

**MarksPathModel**

- `paths: { key: string; label: string; nodes: TrailNode[] }[]`
- Map ladder keys → UI labels: `sight→Unaided`, `exact→Exact`, `streak|daily→Show up` (and optionally expose near/chapter/clean/rounds only in sheets)
- `TrailNode`: key thresholds for trail (curated list per ladder: seeds + current open rung); full list via `listAchievements` filtered by `ladder`
- `status: "passed" | "now" | "ahead"`

**TrainCardModel**

- `primaryLabel`, `secondaryLabel`
- `primaryAction: "practice" | "practice-book"`
- `bookOsis?: string` — set when user picks from far card (session-only UI state, not persisted this pass unless easy)

**IndexModel**

- Story rows → card ids + live meta strings
- Full-data rows → sheet ids

### `buildOverallStats` / `buildGenreStats` / `buildBookStats`

Derive only from `MasteryReport` + `listAchievements` + `effectiveLifetime` / mastery rollups.

**Genre stats:** aggregate all books in genre: rounds, exacts, rates, median miss, tested counts, full book list.

**Book stats:** from `MasterySlice` + any available lifetime dimensions. If a dimension is unknown, show `"—"` and do **not** invent (durability rule).

---

## UI behavior

### Deck

- Container: `height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory`
- Each card: `scroll-snap-align: start; scroll-snap-stop: always; min-height: 100svh`
- Fixed top chrome: ACHIEVEMENTS + theme + home (reuse `.chrome-top-actions` patterns)
- Right-edge dots: one per card; click → `scrollIntoView`
- `IntersectionObserver` updates active dot
- `prefers-reduced-motion`: snap still works; no pulse animations

### Map card

- Render heat segments as buttons; tap updates readout
- Link: open sheet `books`

### Far card

- Show top 3 weak books as large choices
- Selection sets train bias (module-level or closure state for session)
- Link: open sheet `books` with filter far (**all** far books)

### Marks path card

- Path tabs for primary ladders (Unaided / Exact / Show up)
- Trail of ~5 key nodes (from model)
- Tap node → detail face (status, title, desc, progress)
- Links: `marks` (this path full), `marks-all`

### Sheets

- Fixed overlay `position: fixed; inset: 0; z-index` above deck
- Back button closes; Escape closes; body scroll lock while open
- Stats sheet: overall table + genre `<select>` + book `<select>` with detail panels (as mock)
- Selecting a book may sync genre select for context

### Navigation out

- Train primary → `startEndlessRound` / existing practice entry from home
- Daily secondary → existing daily start
- Home icon → `renderHome()`

---

## CSS guidelines

- Reuse CSS variables from `:root` in `styles.css`
- New BEM-ish prefixes: `.deck`, `.deck-card`, `.deck-dots`, `.sheet`, `.trail`, `.path-tab`, `.toc-row`
- Square buttons; primary = terracotta; no `border-radius` on panels except drop-cap `4px`
- Touch targets ≥ 44px
- Do **not** remount theme by recreating whole app incorrectly — theme toggle stays token flip

---

## Testing strategy

1. **Unit:** view-model builders with fixture `AppState` (empty, sparse, heavy).
2. **Unit:** genre/book aggregates — counts sum to 66 books; untested books show zeros.
3. **Unit:** trail nodes ⊆ full ladder list; “now” node matches highest progress locked step.
4. **Existing:** `vitest run` full suite must stay green; don’t break unlock evaluation.
5. **Manual:** phone-width Safari — snap, map tap, sheet open/close, empty install.

Commands:

```bash
cd ~/Developer/versemark
npm test
npm run typecheck
npm run dev
```

---

## Tasks

### Task 0: Plan check-in + branch

**Objective:** Isolate work.

**Steps:**
1. `cd ~/Developer/versemark && git status && git checkout -b feat/achievements-deck`
2. Confirm mockup path exists for reference.
3. Commit plan into repo:

```bash
mkdir -p docs/plans
# copy this file to docs/plans/2026-07-13-achievements-deck-ui.md
git add docs/plans/2026-07-13-achievements-deck-ui.md
git commit -m "docs: plan achievements deck + full-data sheets UI"
```

---

### Task 1: Overall stats builder (TDD)

**Objective:** Pure function for overall metrics used by You card + stats sheet.

**Files:**
- Create: `src/lib/achievements-stats.ts`
- Test: `tests/achievements-stats.test.ts`

**Step 1:** Write tests for empty state and non-empty fixture using `emptyState()` + minimal rounds if helpers exist (mirror `tests/mastery.test.ts` patterns).

Assert at least:
- empty → zeros / em dashes as designed
- rounds split daily vs practice
- exact rate defined when rounds > 0
- books tested count ≤ 66

**Step 2:** `npm test -- tests/achievements-stats.test.ts` → FAIL

**Step 3:** Implement `buildOverallStats(state): OverallStats`

**Step 4:** Tests PASS → commit `feat: overall stats builder for achievements deck`

---

### Task 2: Genre + book stats builders (TDD)

**Objective:** Select-driven detail for stats sheet.

**Files:**
- Modify: `src/lib/achievements-stats.ts`
- Test: `tests/achievements-stats.test.ts`

**Step 1:** Tests:
- genre aggregates: every book of genre listed
- untested book detail: rounds 0, metrics "—"
- sum of genre book counts = 66 across genres

**Step 2:** Implement `buildGenreStats(state, genreKey)`, `buildBookStats(state, osisOrName)`

**Step 3:** Use only `computeMastery` slices + lifetime where available. Unknown → `"—"`.

**Step 4:** PASS → commit `feat: genre and book stats detail builders`

---

### Task 3: Deck model builder (TDD)

**Objective:** Single `buildDeckModel(state)` for all cards.

**Files:**
- Create: `src/lib/achievements-deck-model.ts`
- Test: `tests/achievements-deck-model.test.ts`

**Step 1:** Tests:
- empty → cards `["you","index"]` or equivalent minimal set
- non-empty → includes map, far, close, next (if any locked), marks-path, train, index
- far rows sorted by median distance descending
- next matches `nextClosestAchievement`
- marks-path trail length ≤ 6 per primary path; full ladder length ≥ trail

**Step 2:** Implement using `computeMastery`, `listAchievements`, `nextClosestAchievement`, `bookSegments`, stats builders.

**Step 3:** Headline templates — small pure function with tests (3–4 cases).

**Step 4:** PASS → commit `feat: achievements deck view-model`

---

### Task 4: Deck CSS shell

**Objective:** Styles for snap deck without wiring data.

**Files:**
- Modify: `src/styles.css`

**Step 1:** Add deck/sheet/trail/toc/picker styles under a clear section comment `/* Achievements deck */`.

**Step 2:** Reuse variables; no new color system.

**Step 3:** Visual check in browser later; commit `style: achievements deck and sheet chrome`

---

### Task 5: Sheet host component

**Objective:** Open/close full-data overlays.

**Files:**
- Create: `src/ui/achievements-sheets.ts` (or section in deck module)
- Test: light DOM test optional; prefer unit on fill functions

**API:**

```ts
openSheet(id: SheetId, opts?: { filter?: string; pathKey?: string }): void
closeSheet(): void
```

**Behavior:** Escape closes; focus back button; `aria-modal="true"`.

**Commit:** `feat: achievements full-data sheet host`

---

### Task 6: Render stats sheet (overall + selects)

**Objective:** Complete stats UI with genre/book selects.

**Files:**
- Modify: sheet renderer
- Uses: `achievements-stats.ts`

**Step 1:** Render overall table from `buildOverallStats`.

**Step 2:** Genre select → `buildGenreStats` detail + books in genre.

**Step 3:** Book select → `buildBookStats`; sync genre when book chosen.

**Step 4:** Manual verify with rich localStorage state.

**Commit:** `feat: full stats sheet with genre and book detail`

---

### Task 7: Render books / genres / marks sheets

**Objective:** Complete catalogs.

**Files:** sheet renderer + model helpers

**Step 1:** Books sheet: all 66 grouped by genre; filters far/close/untested.

**Step 2:** Marks sheet: filter `listAchievements` / ladder materialization by path; show current/threshold.

**Step 3:** Marks-all: every ladder section.

**Step 4:** Earned: `unlocked === true` only.

**Step 5:** Genres: six rows + aggregates.

**Commit:** `feat: complete books and marks data sheets`

---

### Task 8: Render deck cards 0–3 (you, map, far, close)

**Objective:** First half of interactive story.

**Files:**
- Create/modify: `src/ui/achievements-deck.ts`
- Modify: `src/main.ts` `renderAchievements` to call `renderAchievementsDeck(app, model, handlers)`

**Step 1:** You card + empty empty-state CTA to daily.

**Step 2:** Map card with tappable segments + open books sheet.

**Step 3:** Far/close cards + open filtered books sheet; far selection updates train model in memory and re-renders train/index labels only (avoid full deck remount if possible — or remount train card text via query).

**Commit:** `feat: achievements deck cards you/map/far/close`

---

### Task 9: Render deck cards 4–5 (next + marks path)

**Objective:** Checkpoints.

**Step 1:** Next card with drop-cap image via existing `dropCap` paths + progress.

**Step 2:** Marks path tabs + trail + face; links to marks sheets.

**Step 3:** Preload drop-caps using existing `dropCapPathsToPreload` where useful.

**Commit:** `feat: next checkpoint and lifelong marks trail cards`

---

### Task 10: Train + Index cards

**Objective:** Actions + navigation home base.

**Step 1:** Train card buttons → existing game entry points (same as home Daily/Practice).

**Step 2:** Index: story TOC `data-goto` scroll; full-data rows open sheets; train CTAs duplicated.

**Step 3:** Dots include all cards; last = Index.

**Commit:** `feat: train and index cards for achievements deck`

---

### Task 11: Wire `renderAchievements` + delete dead scroll UI carefully

**Objective:** Ship the new surface as the only achievements UI.

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css` — leave unused old rules only if shared; remove orphaned achievements-only walls if safe

**Step 1:** Replace body of `renderAchievements` with model build + deck render.

**Step 2:** Keep `makeAchievementRow` if sheets reuse drop-cap rows; else extract shared row helper.

**Step 3:** `npm run typecheck && npm test`

**Step 4:** Commit `feat: replace achievements scroll UI with deck and sheets`

---

### Task 12: DESIGN.md + docs polish

**Objective:** Document secondary surface.

**Files:**
- Modify: `DESIGN.md` — add “Achievements deck” under secondary screens: snap cards, sheets for complete data, index.
- Optional: 10 lines in `docs/achievements.md` under “UI”.

**Commit:** `docs: achievements deck design notes`

---

### Task 13: Manual QA checklist

**Objective:** Real-device confidence.

On phone-width Safari / Aside:

- [ ] Empty install: clear empty card + start daily
- [ ] After 1 round: you/map populate
- [ ] Snap through all cards; dots track
- [ ] Map tap changes readout
- [ ] Far pick updates train label
- [ ] Next shows real locked achievement
- [ ] Marks trail switches paths; face updates
- [ ] Every “full …” control opens sheet with **complete** lists
- [ ] Stats genre + book selects show real aggregates
- [ ] Book select shows all 66 options
- [ ] Escape / back closes sheet
- [ ] Theme toggle does not lose scroll position badly (acceptable remount if documented)
- [ ] Home returns home; Daily/Practice start
- [ ] Reduced motion: no broken layout
- [ ] `npm test` green

---

### Task 14: Ship

**Steps:**
1. `npm run build`
2. Open PR: `feat(achievements): deck UI + full-data sheets`
3. PR body: link plan, list card order, note durability constraints, screenshots (empty + rich)

---

## Mapping: mock labels → ladder keys

| UI path tab | Ladder key(s) |
|-------------|----------------|
| Unaided | `sight` |
| Exact | `exact` |
| Show up | `daily` + trail nodes from `streak` for streak checkpoints (or split tabs later) |
| Sheets only | `near`, `chapter`, `clean`, `rounds`, `unprompted` |

If “Show up” mixing daily+streak is too messy, **v1 tabs:** `sight` / `exact` / `daily` only; streak appears inside Show-up sheet section or marks-all.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| `main.ts` too large | Extract `src/ui/achievements-deck.ts` early (Task 8) |
| Inventing stats not in rollups | `"—"` + docs/achievements durability rule |
| Infinite ladders blow sheets | Use `listAchievements` materialization (already capped with `ahead`) + earned from `achievementUnlocks` |
| Scroll snap iOS quirks | `100svh` + `scroll-snap-stop: always`; test Safari |
| Remount on every far-pick | Update train/index text nodes only |
| Scope creep (paywall) | Explicit non-goal |

---

## Definition of done

- Achievements entry shows **deck**, not unlock wall.
- User can reach **all** stats, **all** books, **all** marks without missing rows.
- Genre + book selectors on stats sheet show **full related detail**.
- Design tokens respected; no kitsch.
- Tests + typecheck green; manual QA checklist complete.

---

## Execution handoff

Plan is ready for subagent-driven-development: one task per subagent, TDD where specified, commit per task.

**Suggested first implementation slice:** Tasks 1–3 (model layer only) before any DOM.
