class MemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  /**
   * Set a value in the cache with a Time-To-Live (TTL) in milliseconds
   */
  set(key: string, value: any, ttlMs: number = 300000): void { // Default 5 minutes
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache. Returns null if expired or not found.
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  /**
   * Invalidate a specific cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();
