export type StorageAdapter = {
  load(key: string): unknown[];
  save(key: string, value: unknown[]): void;
};

export const localStorageAdapter: StorageAdapter = {
  load(key) {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  },

  save(key, value) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  },
};