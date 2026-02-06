import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

let rootLogger: pino.Logger = pino({ level: 'info' });

export function initLogger(level: LogLevel = 'info', dest: 'stdout' | 'stderr' = 'stdout'): pino.Logger {
  rootLogger = pino({ level }, dest === 'stderr' ? pino.destination(2) : undefined);
  return rootLogger;
}

export function getLogger(): pino.Logger {
  return rootLogger;
}

/**
 * Creates a proxy logger that always delegates to the current rootLogger.
 * This ensures that calling initLogger() after module-level createChildLogger()
 * still takes effect (e.g., redirecting to stderr or changing log level).
 */
export function createChildLogger(component: string): pino.Logger {
  return new Proxy({} as pino.Logger, {
    get(_target, prop) {
      const child = rootLogger.child({ component });
      return (child as any)[prop];
    },
  });
}
