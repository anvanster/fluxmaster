const WINDOW_MS = 60_000; // 1-minute sliding window

export class RateLimiter {
  private windows = new Map<string, number[]>();

  check(key: string, limit: number): boolean {
    this.evict(key);
    const timestamps = this.windows.get(key);
    return !timestamps || timestamps.length < limit;
  }

  record(key: string): void {
    this.evict(key);
    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }
    timestamps.push(Date.now());
  }

  getCallCount(key: string): number {
    this.evict(key);
    return this.windows.get(key)?.length ?? 0;
  }

  private evict(key: string): void {
    const timestamps = this.windows.get(key);
    if (!timestamps) return;

    const cutoff = Date.now() - WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }
    if (timestamps.length === 0) {
      this.windows.delete(key);
    }
  }
}
