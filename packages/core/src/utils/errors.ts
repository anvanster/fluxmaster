export function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /rate.?limit|429|timeout|etimedout|econnreset|enotfound|503|502|500|network/i.test(err.message);
}
