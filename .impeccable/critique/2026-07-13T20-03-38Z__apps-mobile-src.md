---
target: Versemark mobile app
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-07-13T20-03-38Z
slug: apps-mobile-src
---
⚠️ DEGRADED: single-context (the user requested autonomous continuation and did not authorize sub-agents)

# Versemark mobile critique — post-improvement

## Nielsen heuristics

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 4 | Daily progress, multiplier, placement, result, and tab badge are visible. |
| 2 | Match system / real world | 4 | “Place,” “Answer,” and chapters-off feedback match the spatial learning model. |
| 3 | User control and freedom | 4 | Native back, editable typed guesses, zoom-out, Done, and expandable text are present. |
| 4 | Consistency and standards | 3 | Serif content and system UI are intentionally split, though a few legacy square controls remain visually web-derived. |
| 5 | Error prevention | 3 | Lock-in is disabled until placement; typed references validate. Timeline taps remain inherently approximate. |
| 6 | Recognition rather than recall | 4 | Inline placement instruction, endpoint labels, answer comparison, and next-practice guidance remove guesswork. |
| 7 | Flexibility and efficiency | 4 | Drag placement, typed references, translation choice, zoom presets, and hints support different skill levels. |
| 8 | Aesthetic and minimalist design | 4 | One quiet action hierarchy; milestones are collapsed; the canon remains the board. |
| 9 | Error recovery | 3 | Invalid references receive guidance and guesses remain editable, but abandoned-round recovery deserves device testing. |
| 10 | Help and documentation | 3 | First-use guidance is embedded in play; advanced scoring rules remain implicit. |
| **Total** | | **36/40** | **Strong, ready for native-device validation** |

## Anti-pattern verdict

The interface no longer reads like a generic generated game or a web page squeezed into a phone. The daily ritual, restrained terracotta action color, marker-shaped progress, canon rail, and learning-first results are specific to Versemark. The deterministic detector found one advisory literal dark-theme border color in `theme.ts`; it is an intentional sRGB translation of the documented dark token, not visual drift.

## What works

- Home now answers the daily-game questions immediately: what today is, how long it takes, how much remains, and whether it is complete.
- The board teaches its unusual two-stage interaction before asking the player to discover it, while keeping the full-canon spatial model intact.
- Results foreground chapters-off learning feedback, then show guess versus answer, with points demoted to supporting information.
- Progress turns raw history into an immediate strongest-area and practice-next recommendation, falling back to book evidence before genre samples mature.

## Remaining priority issues

- **[P2] Validate Dynamic Type and large Android font scales on-device.** The hierarchy is coherent at the reviewed phone size, but long verses, insight metrics, and side-by-side result controls need native accessibility-size screenshots.
- **[P2] Validate the experimental native tab bar on iPad and Android expanded widths.** The controller is configured responsively, but this review used the mobile web renderer and therefore cannot prove the platform-native sidebar/rail presentation.
- **[P3] Clarify scoring depth only when requested.** The multiplier is now visible, but a lightweight rules sheet may help players who want to understand why very distant guesses still earn points.

## Persona checks

- **First-time daily player:** The primary path is visible without scrolling, the time commitment is explicit, and the timeline includes a direct instruction. No blocking onboarding is required.
- **Returning habit player:** Completion status, streak, result replay, and progress badge are visible on entry. Practice remains secondary.
- **Player seeking improvement:** The first daily already yields a strongest book, a practice-next book, a colored canon map, and concrete chapters-off measures.

## Questions skipped

Questions skipped: the user explicitly authorized free improvement without check-ins, and the remaining findings are device-validation tasks rather than unresolved product choices.
