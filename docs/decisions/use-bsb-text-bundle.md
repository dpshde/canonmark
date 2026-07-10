# Use a BSB text bundle built at compile time

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

The game shows real verse and paragraph text. Which translation, and how does the text reach the client of a backend-free app?

## Decision Drivers

- No backend: text must ship with the app or be fetched as static assets.
- License freedom: itch.io distribution and derivative game framing require a public-domain text.
- The maintainer already operates a BSB pipeline (`bsb-bible-toolkit`) and browser-ready BSB data exists in `selah-tools/apps/exedra-search/data/bsb.browser.jsonl` (~1.1 MB, `["Gen.1.1", "text"]` lines).
- Hint step 2 reveals the surrounding paragraph, so paragraph boundaries are needed (`grab-bcv` ships `para-data.json` with paragraph styles for all 66 books).

## Considered Options

- BSB bundle generated from `bsb-bible-toolkit` USFM sources
- Reuse `bsb.browser.jsonl` from exedra-search as-is
- KJV (reuse everyones-scripture `kjv.jsonl`)
- Refs only; fetch text lazily from an external API

## Decision Outcome

Chosen option: **BSB bundle generated from `bsb-bible-toolkit`**, with `bsb.browser.jsonl` from exedra-search acknowledged as a proven-format shortcut for the first prototype (same translation, same content, already browser-shaped).

BSB is public domain, matches the maintainer's other tooling, and the toolkit's USFM source gives verse text plus structure in one pipeline. A build script emits:

- `verses.json(l)`: canonical ref -> verse text (whole Bible, lazily loadable per book if bundle size matters)
- book/chapter metadata: 66 books, chapter counts, cumulative chapter offsets for timeline math
- paragraph ranges for the hint ladder (from toolkit USFM or `grab-bcv` `para-data.json`)

An external API was rejected because it reintroduces a runtime dependency and breaks offline/itch.io play. KJV was rejected to keep all Selah-adjacent projects on one translation.

### Consequences

- Good: fully offline; one `pnpm build:data` style script, artifacts committed or built in CI.
- Good: text provenance and license story is clean (public domain, documented in bsb-bible-toolkit's NOTICE pattern).
- Bad: whole-Bible text is a few MB; mitigate with per-book chunking and gzip, or ship only the curated-pool verses plus lazy book loading.
- The data build script lives in this repo but reads toolkit outputs; document the regeneration command in the README when it exists.
