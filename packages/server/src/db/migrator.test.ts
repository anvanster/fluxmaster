import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Migrator } from './migrator.js';

describe('Migrator', () => {
  let db: Database.Database;
  let migrationsDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migrationsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluxmaster-migrations-'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  it('applies migrations in order', () => {
    fs.writeFileSync(
      path.join(migrationsDir, '001_first.sql'),
      'CREATE TABLE first (id INTEGER PRIMARY KEY);',
    );
    fs.writeFileSync(
      path.join(migrationsDir, '002_second.sql'),
      'CREATE TABLE second (id INTEGER PRIMARY KEY);',
    );

    const migrator = new Migrator(db, migrationsDir);
    const result = migrator.run();

    expect(result.applied).toBe(2);
    expect(result.current).toBe(2);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%%' ESCAPE '\\' ORDER BY name")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain('first');
    expect(names).toContain('second');
  });

  it('skips already-applied migrations', () => {
    fs.writeFileSync(
      path.join(migrationsDir, '001_first.sql'),
      'CREATE TABLE first (id INTEGER PRIMARY KEY);',
    );

    const migrator = new Migrator(db, migrationsDir);
    migrator.run();

    fs.writeFileSync(
      path.join(migrationsDir, '002_second.sql'),
      'CREATE TABLE second (id INTEGER PRIMARY KEY);',
    );

    const result = migrator.run();
    expect(result.applied).toBe(1);
    expect(result.current).toBe(2);
  });

  it('reports applied count', () => {
    fs.writeFileSync(
      path.join(migrationsDir, '001_init.sql'),
      'CREATE TABLE test (id INTEGER PRIMARY KEY);',
    );

    const migrator = new Migrator(db, migrationsDir);
    const result = migrator.run();
    expect(result.applied).toBe(1);
  });

  it('creates _migrations table if not exists', () => {
    const migrator = new Migrator(db, migrationsDir);
    migrator.run();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it('handles empty migrations directory', () => {
    const migrator = new Migrator(db, migrationsDir);
    const result = migrator.run();
    expect(result.applied).toBe(0);
    expect(result.current).toBe(0);
  });

  it('handles non-existent migrations directory', () => {
    const migrator = new Migrator(db, '/nonexistent/path');
    const result = migrator.run();
    expect(result.applied).toBe(0);
    expect(result.current).toBe(0);
  });

  it('rolls back on migration error', () => {
    fs.writeFileSync(
      path.join(migrationsDir, '001_good.sql'),
      'CREATE TABLE good (id INTEGER PRIMARY KEY);',
    );
    fs.writeFileSync(
      path.join(migrationsDir, '002_bad.sql'),
      'INVALID SQL SYNTAX HERE;',
    );

    const migrator = new Migrator(db, migrationsDir);

    // First migration succeeds
    // Second migration fails and rolls back
    expect(() => migrator.run()).toThrow();

    // The good table should exist (applied in first call)
    // But the bad migration should not be recorded
    const versions = db.prepare('SELECT version FROM _migrations').all() as Array<{ version: number }>;
    expect(versions.map((v) => v.version)).toEqual([1]);
  });
});
