---
name: Canonmark
description: Mark where the verse lives — a calm canon-timeline familiarity game for spare minutes.
colors:
  bg: "oklch(0.985 0.003 50)"
  surface: "oklch(0.972 0.004 50)"
  surface-2: "oklch(0.945 0.006 50)"
  ink: "oklch(0.27 0.008 50)"
  ink-2: "oklch(0.45 0.010 50)"
  ink-3: "oklch(0.60 0.008 50)"
  accent: "oklch(0.55 0.15 40)"
  accent-deep: "oklch(0.45 0.14 40)"
  accent-soft: "oklch(0.90 0.035 45)"
  border: "oklch(0.90 0.006 50)"
  success: "oklch(0.52 0.11 145)"
  rail: "oklch(0.93 0.005 50)"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "clamp(1.7rem, 7vw, 2.2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.04rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  score:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  card: "8px"
  btn: "6px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#fff"
    rounded: "{rounded.btn}"
    padding: "0.75rem 1.25rem"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.btn}"
    padding: "0.75rem 1.25rem"
    height: "44px"
  verse:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "0"
  mode-label:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
    padding: "0"
---

# Canonmark — Design System

## Overview

A quiet daily ritual: a verse, a timeline of the canon, a marker laid down. The game board is a clean timeline rail with book segments as subtle warm-tinted sections. Supporting chrome is type-only — no pills, chips, or nested cards. No image assets, no ambient effects, no foil or glow. Warmth comes from serif typography and a single terracotta accent, not from a tinted background.

## Colors

- **Background** (`oklch(0.985 0.003 50)`): near-white with a barely-there warm tilt — not cream, not parchment, just light.
- **Surface** (`oklch(0.972 0.004 50)`): card backgrounds, slightly lifted from the page.
- **Rail** (`oklch(0.93 0.005 50)`): the timeline track the canon sits on.
- **Ink** (`oklch(0.27 0.008 50)`): primary text. Warm near-black, not pure gray.
- **Ink-2 / Ink-3**: secondary and tertiary text, same warm hue.
- **Accent** (`oklch(0.55 0.15 40)`): terracotta. Used for the player's marker, primary buttons, active states, and key actions only.
- **Success** (`oklch(0.52 0.11 145)`): muted olive-green for the true position marker on reveal.
- **Border** (`oklch(0.90 0.006 50)`): subtle warm borders on cards and inputs.

Genre tints on timeline segments are whisper-level — barely perceptible warm/cool shifts, never cartoon blocks.

## Typography

Book serif throughout (Iowan Old Style / Palatino / Georgia stack). Display is tight and weighty, not spaced-out. Labels use small-caps with modest tracking. Body at 1.04rem with comfortable line-height. Score is large and confident.

## Elevation

Minimal. Cards use a hairline border and a very subtle shadow (4px blur max). No heavy drop shadows, no glassmorphism, no glow. Depth comes from the surface color step, not from shadow stacking.

## Components

- **Primary button**: solid terracotta, white label, 44px min height, 6px radius.
- **Secondary button**: transparent with hairline border, muted ink (not accent-colored).
- **Ghost / nav**: plain text, tertiary ink.
- **Verse**: type only over a soft top gradient; no card border or surface.
- **Result**: flat score + one meta line + true location; no chip grid, no nested surfaces.
- **Mode label**: plain small-caps text, no pill.
- **Canon timeline**: full-width canvas rail with subtle genre-tinted book segments; marker is a filled diamond on the rail; reveal draws a thin connector to the true position.

## Do's and Don'ts

- **Do** keep the timeline full-width and uncluttered; it teaches canon proportion.
- **Do** use the terracotta accent sparingly — it marks the player's action, not decoration.
- **Do** keep transitions fast (150–250ms) and purposeful.
- **Don't** use tinted cream/sand backgrounds; the background stays near-white.
- **Don't** add glow, foil, diffraction, or starfield effects.
- **Don't** gamify with badges, streaks-on-fire, or celebratory motion.
- **Don't** trap verse text in dark or glass containers; use the surface card.
