# Build a backend-free static app

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

eachstar needs game rounds, daily puzzles, streaks, and score sharing. Do any of these require a server?

## Decision Drivers

- Maintainer preference: no backend to operate, no hosting cost, no auth, no data liability.
- Daily puzzles must be identical worldwide without coordination.
- Familiarity training is a solo activity; leaderboards are not a launch requirement.

## Considered Options

- Fully static site; all state in localStorage
- Static site + lightweight edge functions (leaderboards, share cards)
- Traditional client + API backend

## Decision Outcome

Chosen option: **fully static site**, because every launch feature is achievable client-side: daily seeding via date hash (see [seed-daily-puzzle-from-date-hash.md](seed-daily-puzzle-from-date-hash.md)), streaks and history in localStorage, sharing via copy-to-clipboard emoji strings (the Wordle pattern, which proved server-side share infrastructure unnecessary).

### Consequences

- Good: deploy anywhere static (Vercel, GitHub Pages, itch.io HTML5, even Arweave); zero operating cost.
- Good: trivially exportable to itch.io as a zipped HTML5 build.
- Bad: no global leaderboard or anti-cheat; scores are self-reported. Accepted; the game is self-competitive.
- Bad: clearing browser storage loses streaks. Mitigate later with an export/import string if users ask.
- If leaderboards ever become a goal, a superseding ADR must introduce the smallest possible backend (for example a single edge KV).
