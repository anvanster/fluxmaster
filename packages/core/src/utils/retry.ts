export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === opts.maxAttempts) {
        break;
      }

      if (opts.signal?.aborted) {
        throw new Error('Retry aborted');
      }

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1),
        opts.maxDelayMs ?? 30000,
      );

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Retry aborted'));
          }, { once: true });
        }
      });
    }
  }

  throw lastError;
}
