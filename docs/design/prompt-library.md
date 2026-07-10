# Prompt Library

Recipes for each asset class, phased per the assets ADR. Every prompt is appended to the shared style preamble; keep asset prompts about the subject, and let the preamble carry the style.

## Style preamble (prepended to every prompt)

> In the style of a luxury artisanal Bible edition: medieval illuminated manuscript traditions fused with 19th-century Romantic engraving revival and high-end modern book arts. Deep teal "Inkstone" leather, deep starry blue fields, restrained gold leaf accents under soft raking light, warm paper grain, meticulous near-black ink linework, flat rich color, dramatic but restrained chiaroscuro. Reverent, unified, anti-decorative; museum-quality craftsmanship; nothing garish, nothing cartoonish, no text or lettering unless specified.

Tune this once in `design/prompts/style/preamble.txt`; do not fork it per asset.

## Phase 1: Celestial band, sky, and chrome textures

The game board is a luminous band of stars arcing across a deep starry-blue sky (see style bible, "The celestial band"). Stars and constellation lines are positioned in code; generated assets supply the sky, the band's nebular glow, genre tints, and sprite/texture material, not literal star layouts.

| id | Prompt sketch | Format |
| --- | --- | --- |
| `sky-base` | "Deep starry-blue night sky, very sparse faint background stars, subtle vignette toward the edges, no moon, no landscape, no constellation figures, seamless tile" | 2048x2048, tileable |
| `band-glow` | "Soft luminous band of nebular light crossing horizontally, like a restrained gold-tinted Milky Way on deep blue, no distinct stars, seamless horizontal tile" | 2048x512, tileable |
| `band-genre-law` | "Nebular band section tinted cool blue-white, faint suggestion of stone tablets in the cloud, extremely subtle" | 2048x512 |
| `band-genre-history` | "...tinted pale bronze, faint suggestion of walls and a crown in the nebula..." | 2048x512 |
| `band-genre-poetry` | "...tinted silver-violet, faint suggestion of a harp in the nebula..." | 2048x512 |
| `band-genre-prophets` | "...tinted ember amber, faint suggestion of refining fire and a scroll..." | 2048x512 |
| `band-genre-gospels` | "...tinted warm gold, faint suggestion of a nativity star and an empty tomb..." | 2048x512 |
| `band-genre-epistles` | "...tinted candle white, faint suggestion of a sealed letter and quill..." | 2048x512 |
| `band-genre-apocalypse` | "...tinted deep gold on darker blue, faint suggestion of a descending city and seven lamps..." | 2048x512 |
| `star-sprites` | "Sprite sheet of small gold-leaf stars at varied brightness: faint glint, standard star, bright named star with fine four-point flare, on transparent or flat deep blue" | 1024x1024 sheet |
| `star-guess` | "Single radiant gold-leaf star, slightly larger, fine engraved eight-point flare, the player's mark, on flat deep blue" | 512x512 |
| `testament-seam` | "Darker gulf in a nebular band with a single distant herald star, seamless blend into band on both sides" | 1024x512 |
| `bg-app-inkstone` | "Full-grain deep teal calfskin leather surface, soft raking studio light, subtle vignette, no objects" | 1536x2048 |
| `bg-card-paper` | "Warm archival paper texture with visible grain and a faint deckle edge, evenly lit" | 1024x1024, tileable |

Acceptance: genre tints must sit within one tonal family (the band reads as a single arc first, genres second); nebular suggestions must stay subliminal at overview zoom; check seams when tiled; check that code-drawn stars and chapter ticks stay legible over every band section; star sprites must share one implied light and flare language; every band texture must survive 90-degree rotation, since portrait phones render the band vertically (mobile-first ADR): check seams and any directional light in both orientations.

## Phase 2: Reveal-screen plates

One plate per book at minimum (66), ideally per signature passage over time. Two production routes:

1. **Doré colorization (preferred where a plate exists).** Image-to-image on a PD scan:
   > "Colorize this engraving with restrained, historically deep color; preserve every line and the full chiaroscuro; palette of deep blues, umber, parchment, and gold highlights; no repainting, no added elements."
2. **Original generation (books without a suitable Doré plate).**
   > "Engraved illustration plate in the manner of a 19th-century Romantic Bible engraving, [SCENE], dense parallel-line shading, dramatic light source, subtle restrained colorization, ornamental one-line border"

Scene selection rule: depict the located passage's own moment when the daily reveals it; fall back to the book's signature scene. Keep depictions of Christ consistent with Doré's conventions; when in doubt, prefer symbol (hand, lamb, light) over face.

Acceptance: linework must read at card size on a phone; chiaroscuro intact; nothing garish (compare against the style bible palette before promoting).

## Phase 3: Icons, badges, share-card art

| id | Prompt sketch | Format |
| --- | --- | --- |
| `icon-star-marker` | "Gold-leaf star emblem with fine engraved flare, in the manner of an illuminated manuscript's gilt star, deep blue field" | 512x512 |
| `icon-constellation-book` | "Tiny gilt constellation figure emblems (harp, scroll, lamb, crown), thin gold linework joining small stars, deep blue field" | 512x512 set |
| `icon-hint-verse` / `-paragraph` / `-testament` | "Small gilt emblem: single scroll line / open paragraph block / two tablets halved" | 512x512 set, same framing |
| `badge-streak-n` | "Debossed gold foil roundel on teal leather, laurel of olive branches, blank center (number set in code)" | 512x512 |
| `badge-perfect` | "Gold foil emblem: hand releasing a dove within a crowned ring" | 512x512 |
| `dropcap-set` | "Illuminated drop cap letter [A-Z], square deep starry blue field, gold accents, letterform integrated with iconography of creation (creating hand, dove, star, vine)" | 1024x1024 per letter, generate as needed |
| `share-card-frame` | "Ornamental engraved frame for a landscape card, corners only, gold on deep teal, empty center" | 1200x630 |

Acceptance: icon set must share one implied light direction and stroke weight; numbers/text are always set in code, never generated.

## Motion (sparing)

| id | Prompt sketch | Use |
| --- | --- | --- |
| `motion-title-loop` | "A luminous star band drifting almost imperceptibly across a deep starry-blue sky, faint gold shimmer, the warm glow of a scriptorium candle at the frame's edge, seamless loop, nearly still" | Title screen, 6 s loop |
| `motion-reveal-ignite` | "A single gold star slowly flaring to full brightness within a nebular band, restrained, no burst, seamless loop" | Reveal moment, 4 s loop |

Acceptance: loops must be seamless and calm; if a loop draws attention to itself, it fails the anti-decorative test.

## Iteration etiquette

- Change one variable per re-roll (subject, palette emphasis, or composition), and record what changed in the manifest `notes`.
- When a prompt consistently wins, backport its phrasing into sibling prompts of the same class to keep the set unified.
- Periodically regenerate one old asset with the current preamble to detect style drift.
