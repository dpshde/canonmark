# Distribute as a static site, installable PWA, and itch.io HTML5 build

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

Where do players get the game, and what does the build pipeline have to produce?

## Decision Drivers

- Backend-free static output makes multiple channels nearly free.
- The maintainer already publishes on itch.io (bsb-bible-toolkit release channel) and operates static hosting for other projects.
- Daily-habit games live or die on returning friction; a home-screen icon (PWA) minimizes it.

## Considered Options

- Static site + installable PWA + itch.io HTML5 export
- Static site only, PWA later
- Native app store wrappers (Capacitor/Tauri)

## Decision Outcome

Chosen option: **static site + PWA + itch.io**, all from one Vite build:

- Primary: static hosting (Vercel or GitHub Pages) at its own URL; service worker + manifest make it an installable, offline-capable PWA (text bundle and pool cached on first visit).
- Secondary: the same `dist/` zipped and uploaded as an itch.io HTML5 game; reaches the Christian indie/game audience and pairs with the existing bsb-bible-toolkit itch presence.
- Publishing to either channel stays manual and intentional (mirroring the bsb-bible-toolkit release-safety rule); CI builds and checks, humans publish.

App store wrappers were rejected for launch: review overhead and packaging complexity buy little over a PWA for a browser-shaped game. A superseding ADR can add them if distribution demands it.

### Consequences

- Good: one artifact, three surfaces (web, home screen, itch).
- Good: offline play works after first load, which the date-hash daily supports naturally.
- Bad: iOS PWA install remains awkward (Safari share-sheet); mitigate with an in-app install hint.
- Bad: itch.io iframe imposes sizing constraints; the layout must be responsive down to itch's default embed size.
- Constraint downstream: keep total first-load payload modest (text chunking per [use-bsb-text-bundle.md](use-bsb-text-bundle.md), no heavy engine per [choose-rendering-technology.md](choose-rendering-technology.md)).
