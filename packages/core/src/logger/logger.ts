import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

let rootLogger: pino.Logger = pino({ level: 'info' });

export function initLogger(level: LogLevel = 'info'): pino.Logger {
  rootLogger = pino({ level });
  return rootLogger;
}

export function getLogger(): pino.Logger {
  return rootLogger;
}

export function createChildLogger(component: string): pino.Logger {
  return rootLogger.child({ component });
}
