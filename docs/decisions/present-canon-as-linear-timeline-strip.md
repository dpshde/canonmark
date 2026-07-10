# Present the canon as a linear timeline strip

- Status: accepted (amended 2026-07-10: presentation metaphor changed to a celestial band; geometry unchanged, see Amendment below)
- Date: 2026-07-10

## Context and Problem Statement

The core interaction is dropping a pin where a verse lives. What visual model of the canon does the player aim at? This is the game's central design decision: the map itself is the thing the player is being trained to internalize.

## Decision Drivers

- The pedagogical goal is a spatial mental model of canonical order and proportion.
- Pin distance must be meaningful and continuous so scoring can be distance-based.
- Must work on phones (small screens, touch) and support 1,189 chapters of precision.

## Considered Options

- Linear timeline strip of the whole canon, zoom in to chapter level
- Bookshelf of 66 book spines sized by chapter count
- Drill-down grid (testament -> book -> chapter)

## Decision Outcome

Chosen option: **linear timeline strip with zoom**, because a single continuous axis makes distance literal (chapters between guess and truth), makes the proportions of the canon visible (Psalms is long, Obadiah is a sliver), and supports one fluid gesture: pan/zoom, then tap to drop.

Interaction model:

- Zoom level 0: full canon strip; books as segments sized by chapter count, testament boundary marked.
- Zoom level 1: book segment expands to show chapter ticks.
- Guesses resolve to a chapter (not a verse); chapter-level precision is the honest limit of a familiarity game.
- Guess confirmed -> strip animates to reveal the true location, distance, and the passage in context.

The bookshelf was rejected because spine-picking is discrete (it becomes multiple choice with 66 options) and distance across shelves is visually misleading. The drill-down grid was rejected because it hides global proportion, which is exactly what we want players to absorb.

### Consequences

- Good: score maps directly to strip geometry; the share emoji string can depict distance on a mini-strip.
- Good: repeated exposure to the full strip is itself the training (players see the whole canon every round).
- Bad: 1,189 chapters on a phone-width strip demands excellent pan/zoom; this drives the rendering-technology decision ([choose-rendering-technology.md](choose-rendering-technology.md)).
- Needs a genre scheme for book segments (law, history, poetry, prophets, gospels, epistles) so the strip teaches structure implicitly; defined in the style bible's celestial band section.

## Amendment (2026-07-10): celestial band presentation

The linear strip is now presented as a **celestial band**: the canon rendered as a luminous arc of stars across a deep starry-blue night sky. Books are constellation segments within the band, chapters are individual stars, and the testament boundary is a visible seam in the arc. The player places a **gold star** (not a pin); on reveal, the true star ignites and a gold line measures the distance to the guess.

What changed: presentation metaphor and marker only (previously a book fore-edge gilt strip with a pin). What did not change: the single continuous axis, chapter-level resolution, zoom model, distance semantics, and all scoring. A free-form 2D constellation sky was considered and rejected because 2D placement makes distance arbitrary and replaces the canon's real proportions with an invented layout, undermining the familiarity thesis.

The book-arts materiality survives in the surrounding chrome (cards, badges, frames); see the style bible for the hybrid.

Orientation is responsive per [design-mobile-first.md](design-mobile-first.md): the band runs vertically on portrait phones (Genesis at top, thumb-scrolled) and horizontally on wide viewports; one geometry, one axis, orientation as a transform.
