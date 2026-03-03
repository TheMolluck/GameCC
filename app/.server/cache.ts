export class SimpleCache<T> {
  private cache: Map<string, { value: T; expires: number }> = new Map();
  constructor(private ttlMs: number = 5 * 60 * 1000) {} // default 5 min

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.cache.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
