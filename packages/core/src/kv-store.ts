/**
 * Platform-neutral key/value storage port.
 * Web: localStorage adapter. Native: memory + AsyncStorage hydrate.
 * Core never imports localStorage / AsyncStorage directly.
 */

export interface KvStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** In-memory backend — default for tests and native until hydrated. */
export function createMemoryKvStore(
  initial?: Iterable<readonly [string, string]>
): KvStore & { _map: Map<string, string> } {
  const map = new Map<string, string>(initial);
  return {
    _map: map,
    getItem(key: string): string | null {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
  };
}

let backend: KvStore = createMemoryKvStore();

/** Inject platform storage (call once at app bootstrap). */
export function setStorageBackend(store: KvStore): void {
  backend = store;
}

export function getStorageBackend(): KvStore {
  return backend;
}

/** Reset to a fresh memory store (tests). */
export function resetStorageBackend(): void {
  backend = createMemoryKvStore();
}
