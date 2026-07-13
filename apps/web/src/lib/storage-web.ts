import {
  setStorageBackend,
  type KvStore,
} from "@versemark/core";

/** Browser localStorage adapter for @versemark/core. */
export function createLocalStorageKvStore(): KvStore {
  return {
    getItem(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

/** Wire core persistence to localStorage (idempotent). */
export function installWebStorage(): void {
  setStorageBackend(createLocalStorageKvStore());
}
