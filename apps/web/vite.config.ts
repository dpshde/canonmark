import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@versemark/core": path.resolve(rootDir, "../../packages/core/src/index.ts"),
    },
  },

  base: "./",
  publicDir: "public",
  plugins: [
    // Cast: vite-plugin-pwa targets root vite; vitest nests its own vite types.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
      ],
      // Hand-authored manifest in public/ — keep it as the source of truth.
      manifest: false,
      workbox: {
        // App shell + bundled assets + static data for offline daily play.
        globPatterns: [
          // webp: achievement drop caps under public/assets/achievements/
          "**/*.{js,css,html,ico,png,svg,webp,webmanifest,json,woff2}",
        ],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }) as never,
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
