# Record architecture decisions

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

eachstar is a new standalone project. Its central design questions (map paradigm, rendering technology, scoring, seeding) were debated up front and should not be re-litigated silently later. How do we capture the "why" behind these choices?

## Decision Drivers

- Solo/small-team project; future contributors (human or agent) need fast orientation.
- Sibling projects (grab-bcv, bible-linkify, bsb-bible-toolkit) rely on AGENTS.md-style docs; this project adds decision history as well.

## Considered Options

- MADR template
- Nygard template (Context/Decision/Consequences only)
- No ADRs, just a README

## Decision Outcome

Chosen option: **MADR**, because the founding decisions all involved genuinely competing options (Solid vs lean vanilla, DOM vs canvas vs engine, curated vs uncurated pools) and MADR forces the rejected options and their trade-offs onto the page.

File naming follows the architecture-decision-record repo guidance: lowercase-dash, present-tense imperative verb phrase, one decision per file.

### Consequences

- Good: rejected options stay visible, preventing circular debates.
- Bad: slightly heavier to write than Nygard; keep entries short to compensate.
