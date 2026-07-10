# Generate UI art and assets with Grok Imagine

- Status: accepted
- Date: 2026-07-10

## Context and Problem Statement

eachstar should feel like a luxury artisanal Bible edition, not a flat web toy. The art direction (see [../design/style-bible.md](../design/style-bible.md)) calls for illuminated drop caps, colorized Doré-style engraving plates, gilt textures, and painterly reveal moments. Producing this by hand is beyond a solo project's budget. How are the assets made?

## Decision Drivers

- The style bible demands unified, high-craft art across dozens of assets (genre textures, per-book reveal plates, icons, badges, motion moments).
- The maintainer has working Grok Imagine access (xAI API, already integrated in the grok-cast Raycast extension) and wants a dedicated, reproducible pipeline rather than ad hoc generation.
- Assets must be regenerable and refinable as the style tightens; prompts are source, images are build artifacts.
- Public-domain Gustave Doré engravings are a legitimate raw material for colorization workflows.

## Considered Options

- Dedicated scripted pipeline: xAI image-generation API driven by versioned prompt manifests in this repo
- Manual generation via grok-cast, curated by hand into `assets/`
- Commission a human illustrator
- Assemble from existing open/PD assets only (Doré scans, ornament clip art)

## Decision Outcome

Chosen option: **dedicated scripted pipeline using the xAI API directly**, documented in [../design/grok-imagine-pipeline.md](../design/grok-imagine-pipeline.md).

- Prompts live in versioned JSON manifests (`design/prompts/*.json`); every committed asset traces to a manifest entry (prompt, model, seed where supported, date).
- A repo script calls the xAI image-generation endpoint, writes candidates to an ungitted `design/out/` staging area; a human promotes winners into `assets/`.
- Video generation (Grok Imagine video) is used sparingly for the title screen loop and the reveal moment, per the same manifest discipline.
- Public-domain Doré engravings may be used as image-to-image inputs for colorization plates; sources and PD status are recorded per asset.
- Manual grok-cast generation remains fine for exploration, but nothing ships unless its prompt is captured in a manifest.

An illustrator is rejected for cost and iteration speed (revisit for a flagship asset if the game earns it). PD-assembly-only is rejected because it cannot deliver the unified bespoke language (drop caps, genre textures) the style bible requires.

### Consequences

- Good: art is reproducible, style drift is diffable, and re-rolling the whole set after a style-bible change is one script run.
- Good: human curation gate keeps quality control; generation proposes, the maintainer disposes.
- Bad: model outputs vary between xAI model versions; record the model ID per asset and accept that exact re-generation is best-effort.
- Bad: AI-generated art requires a disclosure/provenance note (see pipeline doc, Provenance section) and care that Doré-derived plates start from genuinely public-domain scans.
- The pipeline script needs an `XAI_API_KEY`; it must never be committed and generation must never run in CI.
