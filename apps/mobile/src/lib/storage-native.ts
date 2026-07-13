/**
 * Durable KvStore for @versemark/core via AsyncStorage.
 *
 * Core is synchronous (getItem/setItem). We hydrate a memory map from
 * AsyncStorage once at startup, then write-through on every set/remove.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createMemoryKvStore,
  setStorageBackend,
  STORAGE_KEY_V2,
  STORAGE_KEY_V3,
  type KvStore,
} from "@versemark/core";

const KEYS = [STORAGE_KEY_V3, STORAGE_KEY_V2] as const;

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Build a write-through KvStore: sync memory for core, async disk for durability.
 * Exported for unit tests with a fake AsyncStorage.
 */
export async function createHydratedAsyncKvStore(
  disk: AsyncStorageLike = AsyncStorage
): Promise<KvStore & { _map: Map<string, string> }> {
  const memory = createMemoryKvStore();
  await Promise.all(
    KEYS.map(async (key) => {
      try {
        const value = await disk.getItem(key);
        if (value != null) memory.setItem(key, value);
      } catch {
        // Fail-open: memory stays empty for this key.
      }
    })
  );

  return {
    _map: memory._map,
    getItem(key: string): string | null {
      return memory.getItem(key);
    },
    setItem(key: string, value: string): void {
      memory.setItem(key, value);
      void disk.setItem(key, value).catch(() => {
        // Fail-open: in-session state still correct.
      });
    },
    removeItem(key: string): void {
      memory.removeItem?.(key);
      void disk.removeItem(key).catch(() => {
        // ignore
      });
    },
  };
}

/** Install durable storage as core's backend (call once before loadState). */
export async function installNativeStorage(
  disk: AsyncStorageLike = AsyncStorage
): Promise<KvStore> {
  const store = await createHydratedAsyncKvStore(disk);
  setStorageBackend(store);
  return store;
}
