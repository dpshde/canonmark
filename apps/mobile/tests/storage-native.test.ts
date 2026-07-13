import { describe, it, expect, beforeEach } from "vitest";
import {
  createHydratedAsyncKvStore,
  installNativeStorage,
} from "../src/lib/storage-native";
import {
  STORAGE_KEY_V3,
  loadState,
  saveState,
  emptyAppState,
  resetStorageBackend,
  getStorageBackend,
} from "@versemark/core";

function fakeDisk(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    async getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      map.set(key, value);
    },
    async removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("native AsyncStorage KvStore adapter", () => {
  beforeEach(() => {
    resetStorageBackend();
  });

  it("hydrates memory from disk keys used by core", async () => {
    const seed = emptyAppState();
    seed.streak = 7;
    seed.bestStreak = 12;
    const disk = fakeDisk({
      [STORAGE_KEY_V3]: JSON.stringify(seed),
    });
    const store = await createHydratedAsyncKvStore(disk);
    expect(store.getItem(STORAGE_KEY_V3)).toContain('"streak":7');
  });

  it("write-through persists setItem to disk", async () => {
    const disk = fakeDisk();
    const store = await createHydratedAsyncKvStore(disk);
    store.setItem(STORAGE_KEY_V3, '{"hello":1}');
    // Allow microtask for void async write
    await new Promise((r) => setTimeout(r, 0));
    expect(await disk.getItem(STORAGE_KEY_V3)).toBe('{"hello":1}');
    expect(store.getItem(STORAGE_KEY_V3)).toBe('{"hello":1}');
  });

  it("installNativeStorage + loadState/saveState round-trip via real core APIs", async () => {
    const disk = fakeDisk();
    await installNativeStorage(disk);
    expect(getStorageBackend().getItem(STORAGE_KEY_V3)).toBeNull();

    const state = emptyAppState();
    state.practiceRounds = 3;
    state.lifetime.scoredRounds = 3;
    saveState(state);

    await new Promise((r) => setTimeout(r, 0));
    const raw = await disk.getItem(STORAGE_KEY_V3);
    expect(raw).not.toBeNull();
    expect(raw!).toContain("practiceRounds");

    // Fresh hydrate simulates cold start
    resetStorageBackend();
    await installNativeStorage(disk);
    const loaded = loadState();
    expect(loaded.practiceRounds).toBe(3);
    expect(loaded.lifetime.scoredRounds).toBe(3);
  });
});
