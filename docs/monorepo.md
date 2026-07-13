# Monorepo layout (Expo-first)

Versemark is an **npm workspaces** monorepo. Mobile (Expo / React Native) is the primary native client; web remains a Vite static PWA shell.

## Packages

| Path | Name | Role |
| --- | --- | --- |
| `packages/core` | `@versemark/core` | Platform-neutral domain: scoring, daily seed, game flow, achievements, mastery, books/axis, durable state + `KvStore` port |
| `apps/mobile` | `@versemark/mobile` | Expo app (React Native) |
| `apps/web` | `@versemark/web` | Vite + Canvas timeline + DOM chrome (legacy web surface) |

## What is shared

**Shared:** pure TypeScript domain and types. Both apps import `@versemark/core`.

**Not shared (by design):**

- Canvas `CanonStrip` timeline (web-only; native strip later)
- Haptics / sounds / PWA install (`apps/web`)
- Theme preference UI + CSS tokens (web) vs RN `StyleSheet` (mobile)
- Achievements deck DOM UI (`apps/web/src/ui`)
- Share **delivery** (navigator / Share API); share **text** builders are in core

## Storage boundary

Core never calls `localStorage` or AsyncStorage. Apps inject a `KvStore`:

```ts
import { setStorageBackend, createMemoryKvStore } from "@versemark/core";
// web: createLocalStorageKvStore() from apps/web/src/lib/storage-web.ts
// mobile: memory now; AsyncStorage hydrate later
setStorageBackend(adapter);
```

## Scripts (repo root)

```bash
npm install
npm run mobile          # expo start
npm run web             # vite dev
npm test                # core + web platform tests
npm run typecheck       # core + web + mobile
npm run build           # web production static
npm run export:mobile   # expo export (when toolchain available)
```

## Product note

Earlier ADRs described a web-only static app. Mobile delivery is now first-class via Expo; web stays for PWA / itch-style static hosting. Game rules are unchanged.
