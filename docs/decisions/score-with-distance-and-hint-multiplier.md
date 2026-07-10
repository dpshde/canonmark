# Score with distance points times a hint multiplier

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

Scoring must reward two distinct skills: precision (how close the placed star lands) and independence (how little context the player needed). How are these combined?

## Decision Drivers

- Familiarity is precisely "how little context do you need to place a passage"; scoring should teach that.
- Distance on the timeline strip is continuous and intuitive.
- The share string should compress the result legibly (Wordle-style).

## Considered Options

- Distance points x hint multiplier
- Distance-only scoring
- Zoom-ladder-only scoring (fewer hints = more points, distance ignored)

## Decision Outcome

Chosen option: **distance points x hint multiplier**.

Distance points (0-1000): computed from chapter distance between guess and truth on the canonical axis of 1,189 chapters, with a generous exponential falloff:

```text
d      = |guessChapterIndex - trueChapterIndex|   // indices 1..1189 in canonical order
points = round(1000 * 0.5^(d / 40))               // half-life: 40 chapters
```

Reference values: d=0 -> 1000, d=1 -> 983, d=10 -> 841, d=40 -> 500, d=80 -> 250, d=150 -> 74, d=300 -> 6, d>=~440 -> 0. The 40-chapter half-life means landing anywhere in the right neighborhood of a large book still scores solidly, while cross-testament misses fall to near zero. All-integer, deterministic, and identical on every client.

Hint ladder (three steps, per prior decision):

| Step | Revealed | Multiplier |
| --- | --- | --- |
| 1 | Verse text only | x3 |
| 2 | + surrounding paragraph | x2 |
| 3 | + testament half (e.g. "first half of the OT") | x1 |

Testament halves are fixed, book-aligned quadrants of the canonical axis (chapter indices verified against the 1,189-chapter canon):

| Quadrant revealed | Books | Chapter indices |
| --- | --- | --- |
| OT, first half (Law and History) | Genesis-Esther | 1-436 |
| OT, second half (Poetry and Prophets) | Job-Malachi | 437-929 |
| NT, first half (Gospels and Acts) | Matthew-Acts | 930-1046 |
| NT, second half (Epistles and Revelation) | Romans-Revelation | 1047-1189 |

The player may take hints before placing the star; the multiplier locks at the last hint taken. Max round score: 3000.

Distance-only was rejected because it ignores the hint ladder that makes the game trainable (players could always max out hints for free). Ladder-only was rejected because it wastes the timeline's continuous distance signal.

### Consequences

- Good: two-axis mastery: veterans chase x3 no-hint precision; beginners use hints and still get satisfying scores.
- Good: share string can encode both (e.g. star emoji distance bar + hint count).
- Bad: the half-life (40 chapters) and multiplier balance may need playtesting adjustment; any tuning change must amend this ADR with a date, and changes after launch alter score comparability between puzzle numbers (note it in the share string era if it ever happens).
- Paragraph hint (step 2) depends on paragraph data from the text bundle decision ([use-bsb-text-bundle.md](use-bsb-text-bundle.md)).
