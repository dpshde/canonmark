# Expo-first monorepo

**Status:** Accepted  
**Date:** 2026-07-13

## Context

The original stack was a single Vite + vanilla DOM/Canvas web app. Product now targets mobile as a first-class client while retaining a static web PWA.

## Decision

- Use npm workspaces with `@versemark/core` (pure TS domain), `@versemark/mobile` (Expo), `@versemark/web` (Vite shell).
- Share domain logic and types only; do not force a shared React Native Web component layer for Canvas strip / haptics / install.
- Persist via `KvStore` port; platforms inject localStorage or memory/AsyncStorage.

## Consequences

- Web ADRs that assume "only Vite root" are superseded for packaging; game rules and scoring ADRs remain.
- Native timeline strip is deferred; Expo shell proves core import path.
