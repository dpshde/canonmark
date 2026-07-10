# Choose rendering technology for the timeline strip

- Status: accepted (2026-07-10, resolved by workload analysis; see Resolution)
- Date: 2026-07-10

## Context and Problem Statement

The timeline strip needs smooth pan/zoom across 1,189 chapters with a satisfying, game-like feel on mobile. The rest of the app (menus, hint cards, score screens) is ordinary UI. What renders the strip, and does the project adopt a game engine?

## Decision Drivers

- Maintainer preference: lean stack, expand only as needed; curiosity about PixiJS/Phaser.
- The strip is one interactive scene, not a multi-scene game world.
- Pan/zoom physics (momentum, pinch, snap-to-chapter) is where the "juice" lives.
- Bundle size matters for itch.io HTML5 and PWA installs.
- Verse text, hint cards, and score UI are text-heavy and belong in the DOM regardless.

## Considered Options

- Vanilla TS + Canvas 2D, hand-rolled pan/zoom, DOM for all UI
- PixiJS for the strip, DOM for all UI
- Phaser for the whole game
- DOM/SVG only (no canvas)

## Decision Outcome

Chosen option: **vanilla TS + Canvas 2D for the strip, DOM for everything else**, with an explicit upgrade path to **PixiJS** if real hardware cannot hold the performance floor from [design-mobile-first.md](design-mobile-first.md) (~30fps during pan/pinch-zoom on low-end hardware with effect tiers reduced; 60fps where hardware allows).

Reasoning:

- The strip is essentially one horizontally scrollable bar with rectangles, ticks, and labels. Canvas 2D handles this comfortably; the hard part is input handling and easing math, which an engine does not remove.
- PixiJS (~100 KB gzipped) is the right escalation if WebGL is needed: it accelerates exactly this kind of 2D scene and composes fine with a DOM UI layer. Adopting it later is a contained change if the strip renderer is written behind a small interface (`StripRenderer` with `render(viewport)`, hit-testing, and animation hooks).
- Phaser is rejected: it is a full game framework (scenes, physics, asset pipeline, ~1 MB) solving problems this game does not have, and it fights the DOM-first UI.
- DOM/SVG-only is rejected for the strip: 1,189 chapter ticks plus zoom transforms is achievable but tends toward jank and fussy virtualization on mobile; canvas is simpler at this density.

### Consequences

- Good: near-zero framework weight at launch; the whole app can start as Vite + vanilla TS.
- Good: `StripRenderer` interface keeps the PixiJS door open without a rewrite.
- Bad: hand-rolling inertial pan/pinch-zoom is real work; steal proven gesture math rather than inventing it.
- Follow-up: the first playable build must include a debug fps counter; if a low-end device measures below the floor with effects tiered down, supersede this ADR with an adopt-pixijs ADR.

## Resolution (2026-07-10): accepted by workload analysis

A device spike was replaced by a scene-budget analysis, which is decisive at this workload size:

- Worst-case scene: ~1,189 chapter stars + ~200 ambient background stars + band glow + constellation linework + one guess star + UI overlays. That is under ~1,500 sprites in a single scene, and most are static relative to the band.
- The band (nebula, genre tints, seam, constellation lines) is pre-rendered once per zoom bucket to offscreen canvases; per-frame work reduces to a few `drawImage` blits plus the code-drawn stars near the viewport and the animated glow. Stars outside the viewport are culled trivially on a 1D axis.
- Canvas 2D comfortably sustains thousands of `drawImage` calls per frame on decade-old mobile GPUs; the 30fps floor with effect tiers (fewer ambient stars, static nebula, no motion loops) leaves a wide margin. The risk case for Canvas 2D is per-pixel effects and massive overdraw, neither of which this scene requires.
- Therefore the low-end floor does not justify PixiJS's ~100 KB at launch. The measured-fps follow-up above stands as the safety net, and the `StripRenderer` interface remains the containment boundary.
