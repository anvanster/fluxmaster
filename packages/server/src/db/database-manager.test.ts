import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DatabaseManager } from './database-manager.js';

describe('DatabaseManager', () => {
  let dbPath: string;
  let dm: DatabaseManager | undefined;

  afterEach(() => {
    dm?.close();
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      // WAL files
      for (const suffix of ['-wal', '-shm']) {
        const walPath = dbPath + suffix;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      }
    }
  });

  function createTempDb(): string {
    const tmpDir = os.tmpdir();
    dbPath = path.join(tmpDir, `fluxmaster-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    return dbPath;
  }

  it('creates database file', () => {
    dm = new DatabaseManager(createTempDb());
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('opens in WAL mode by default', () => {
    dm = new DatabaseManager(createTempDb());
    const mode = dm.connection.pragma('journal_mode', { simple: true });
    expect(mode).toBe('wal');
  });

  it('can disable WAL mode', () => {
    dm = new DatabaseManager(createTempDb(), { walMode: false });
    const mode = dm.connection.pragma('journal_mode', { simple: true });
    expect(mode).not.toBe('wal');
  });

  it('enables foreign keys', () => {
    dm = new DatabaseManager(createTempDb());
    const fk = dm.connection.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('runs initial migration', () => {
    dm = new DatabaseManager(createTempDb());
    dm.migrate();

    const tables = dm.connection
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('usage');
    expect(tableNames).toContain('requests');
    expect(tableNames).toContain('_migrations');
  });

  it('is idempotent — migrate twice is safe', () => {
    dm = new DatabaseManager(createTempDb());
    dm.migrate();
    expect(() => dm!.migrate()).not.toThrow();
  });

  it('reports isOpen status', () => {
    dm = new DatabaseManager(createTempDb());
    expect(dm.isOpen).toBe(true);
    dm.close();
    expect(dm.isOpen).toBe(false);
    dm = undefined; // prevent double close in afterEach
  });

  it('creates in-memory database', () => {
    dbPath = ':memory:';
    dm = new DatabaseManager(':memory:');
    dm.connection.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
    dm.connection.prepare('INSERT INTO test (id) VALUES (1)').run();
    const row = dm.connection.prepare('SELECT id FROM test').get() as { id: number };
    expect(row.id).toBe(1);
  });
});
