# Curate the verse pool from Exedra topic-verse rankings

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

Daily puzzles (and default endless rounds) need a curated pool of verses. Uncurated random verses land on genealogies, census lists, and obscure legal minutiae, which frustrates rather than trains. Hand-curating hundreds of verses is slow. What is the pool source?

## Decision Drivers

- Pool should favor passages people actually encounter and search for; those are the ones worth having a mental map for.
- Curation must be a build-time artifact (backend-free).
- The maintainer already has `selah-tools/apps/exedra-search/data/topic-verse-rankings.browser.json`: 6,687 topics, each mapped to ranked canonical passages (`[["EXO.20.1-26", 7, 1], ...]` as OSIS ref, score, rank).

## Considered Options

- Derive pool from Exedra `topic-verse-rankings.browser.json`
- Hand-curated list
- Uncurated: any verse in the canon
- Popularity data from an external source (e.g. published "most searched verses" lists)

## Decision Outcome

Chosen option: **derive the pool from Exedra topic-verse rankings**. A build script:

1. Takes the union of all ranked passages across topics.
2. Parses each ref with `grab-bcv`; normalizes ranges and whole-chapter refs to a representative verse (start verse) while keeping the full range for the reveal screen.
3. Deduplicates and weights by how many topics reference a passage and its rank scores, so John 3:16-class passages appear but do not dominate.
4. Emits `pool.json` with canonical ref, weight, and topic tags (tags can power a future themed mode).

This gives thousands of demonstrably relevant passages with zero manual curation, and the pipeline reruns whenever Exedra's ETL improves. Hand-curation is kept as an override layer (small allow/deny list) rather than the primary mechanism.

### Consequences

- Good: pool quality inherits Exedra's ranking work; improvements flow in for free.
- Good: topic tags enable "familiarity by theme" later without new data work.
- Bad: build-time coupling to a selah-tools artifact; snapshot the input file (or its generated output) in this repo so builds are reproducible without the monorepo checked out.
- Bad: rankings skew toward felt-need topics (marriage, anxiety, money); spot-check genre coverage and patch with the override list if poetry/prophecy are underrepresented.
- Endless mode may additionally offer an "anywhere in the canon" toggle that bypasses the pool for hard-mode reps.
