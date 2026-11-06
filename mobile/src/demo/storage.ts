// On web this is a no-op and the browser's localStorage is used. On iOS and
// Android it installs a SQLite-backed localStorage with the same API.
import 'expo-sqlite/localStorage/install';

/**
 * Reads and writes demo data as JSON. Storage can be missing or throw (a
 * private window, blocked site data), so every call falls back quietly.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // The demo keeps working in memory.
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
