# Seed the daily puzzle from a date hash over the curated pool

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

The game has a daily mode (shared, shareable) and an endless practice mode. Without a backend, how does everyone get the same daily puzzle, and how are results shared?

## Decision Drivers

- Backend-free constraint ([build-backend-free-static-app.md](build-backend-free-static-app.md)).
- Daily identity worldwide drives the social loop ("did you get today's?").
- Puzzle quality must be consistent, hence the curated pool ([curate-verse-pool-from-topic-rankings.md](curate-verse-pool-from-topic-rankings.md)).

## Considered Options

- Date-hash + curated pool + emoji share string
- Date-hash over all verses (uncurated)
- Precomputed puzzle calendar JSON shipped with the app

## Decision Outcome

Chosen option: **date-hash + curated pool + emoji share string**.

Mechanics:

- Puzzle number `N` = days since the epoch date, computed in the player's local timezone (the Wordle convention; date-line differences are accepted). **Epoch: 2026-08-01 local is puzzle #1** (dates before launch simply become archive puzzles).
- Selection: deterministic PRNG seeded from `N`. **Frozen algorithm: seed string `"eachstar#" + N` hashed with xmur3, feeding mulberry32**; both are tiny, public-domain, well-tested JS PRNG routines. The PRNG drives weighted sampling over `pool.json`, re-rolling while the candidate appeared in the previous **180** puzzle numbers (window replayed deterministically from puzzle #1, so no stored history is needed). All computable client-side from the same shipped `pool.json`.
- Endless mode: same pool, locally random, unlimited; a hard-mode toggle may bypass the pool.
- Share string: `Each Star #N` plus an emoji mini-band depicting guess distance (e.g. `🌌🌌⭐🌌✨🌌🌌` with the guess star and the true star marked) and hint count (e.g. 🟡 for no hints), copied to clipboard. No URLs required, though a link to the app is appended.

Uncurated hashing was rejected on puzzle quality. A precomputed calendar was rejected because it needs periodic regeneration and redeploys to stay ahead, whereas the hash needs neither; the hash approach is also what the pool-weighting already supports. If editorial dailies are ever wanted (e.g. Christmas passages in Advent), a small date-override map can layer on top without superseding this decision.

### Consequences

- Good: zero infrastructure; the daily works offline once the app is cached.
- Good: deterministic replay: any past puzzle number is reconstructible for an archive mode.
- Bad: the answer is derivable by anyone reading the client code; acceptable, cheating in a self-training game only cheats yourself.
- Bad: changing the pool file shifts future selections; `pool.json` is versioned and the epoch (2026-08-01), seed derivation (xmur3 of `"eachstar#" + N`), PRNG (mulberry32), and history window (180) are frozen as of this amendment. Pool updates must only append or re-weight in ways verified not to change already-published puzzle numbers (regression-test the first N puzzles on every pool change).
- Bad: replaying the 180-window from puzzle #1 makes day-N computation O(N) selections; trivial cost (thousands of PRNG draws) for decades of dailies.
