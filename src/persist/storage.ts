/**
 * Best-effort browser storage. Some privacy/sandboxed contexts expose the
 * localStorage global but throw SecurityError on every read/write; preferences
 * must never become a bootstrap dependency for the simulation.
 */
export function storageGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
