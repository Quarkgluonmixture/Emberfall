/**
 * Best-effort browser storage. Some privacy/sandboxed contexts expose the
 * localStorage global but throw SecurityError even while resolving the property;
 * preferences must never become a bootstrap dependency for the simulation.
 */
function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function storageGet(key: string): string | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
