import { describe, it, expect } from 'vitest';
import { initLogger, getLogger, createChildLogger } from './logger.js';

describe('Logger', () => {
  it('creates a logger with default info level', () => {
    const logger = initLogger();
    expect(logger.level).toBe('info');
  });

  it('creates a logger with specified level', () => {
    const logger = initLogger('debug');
    expect(logger.level).toBe('debug');
  });

  it('getLogger returns the root logger', () => {
    initLogger('warn');
    const logger = getLogger();
    expect(logger.level).toBe('warn');
  });

  it('creates child logger with component name', () => {
    initLogger('silent');
    const child = createChildLogger('auth');
    expect(child).toBeDefined();
    // Child logger should have the bindings
    expect(child.bindings().component).toBe('auth');
  });
});
