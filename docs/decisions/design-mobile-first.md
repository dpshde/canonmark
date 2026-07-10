# Design for mobile as the first-class platform

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

A daily-habit familiarity game is played in spare minutes, overwhelmingly on phones. Is mobile an adaptation of a desktop layout, or the primary design target that desktop adapts from?

## Decision Drivers

- Daily mode's habit loop lives where the player's pocket is; PWA install ([distribute-as-static-site-pwa-and-itch.md](distribute-as-static-site-pwa-and-itch.md)) presumes phone home screens.
- The celestial band demands precise placement among 1,189 chapters; touch precision and reach are the binding constraints, not mouse precision.
- itch.io embed and desktop browsers remain supported surfaces, but they are wider, easier targets.

## Considered Options

- Mobile-first: portrait touch layout is the design origin; desktop adapts
- Desktop-first with responsive squeeze
- Separate layouts designed independently

## Decision Outcome

Chosen option: **mobile-first**. Concretely:

### Band orientation

- Portrait (primary): the celestial band runs **vertically**: Genesis at top, Revelation at bottom, thumb-scrolled like the natural reading axis of a phone. All celestial styling (nebular glow, genre tints, constellation figures, testament seam) carries over unchanged, rotated to the vertical axis.
- Wide viewports (landscape, desktop, itch embed): the band lies horizontally as the original "arc across the sky." One geometry, one axis, two orientations; the renderer treats orientation as a transform, not a second layout.

### Touch input

- Place the guess star by **drag or tap**: tap anywhere on the band to set it, or drag the star along the band; either way placement is provisional until an explicit **Confirm** button (docked in the bottom thumb zone) locks it.
- Fine adjustment: while the star is held or after a tap, a magnifier lens shows the local chapter neighborhood so a fingertip can hit a chapter without covering it.
- Minimum touch targets 44px; all primary actions (hint, confirm, share) reachable one-handed in the bottom third.

### Performance floor

- Design floor: low-end devices; **30fps is the acceptable floor** during pan/zoom, 60fps where hardware allows.
- The renderer ships effect tiers: background star counts, glow shaders, and motion loops degrade gracefully (fewer sprites, static nebula, no video loops) below the floor or on data-saver.
- This relaxes the rendering ADR's escalation trigger: PixiJS is warranted only if Canvas 2D cannot hold ~30fps on low-end hardware with effects tiered down ([choose-rendering-technology.md](choose-rendering-technology.md)).

Desktop-first was rejected because every hard problem (reach, precision, jank) exists only on the phone; solving them first makes desktop trivial, not vice versa. Independent layouts were rejected as double maintenance for a solo project.

### Consequences

- Good: the thumb-scroll vertical canon is arguably a better reading of the medium than side-panning; scroll position itself teaches canonical order.
- Good: explicit confirm eliminates fat-finger mis-scores, protecting the daily's one-shot stakes.
- Bad: two orientations must be tested for every band asset; tileable textures need to survive rotation (add to prompt-library acceptance checks).
- Bad: the emoji share mini-band stays horizontal (text lines are horizontal) even though portrait play is vertical; accepted as a lossy glyph, not a map.
- Playtest the magnifier early; it is the riskiest interaction on the low-end floor.
