import type Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface MigrationResult {
  applied: number;
  current: number;
}

export class Migrator {
  private migrationsDir: string;

  constructor(
    private db: Database.Database,
    migrationsDir?: string,
  ) {
    this.migrationsDir = migrationsDir ?? path.join(import.meta.dirname, 'migrations');
  }

  run(): MigrationResult {
    this.ensureMigrationsTable();

    const applied = this.getAppliedVersions();
    const files = this.getMigrationFiles();
    let newApplied = 0;

    for (const file of files) {
      const version = this.parseVersion(file);
      if (applied.has(version)) continue;

      const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf-8');

      const transaction = this.db.transaction(() => {
        this.db.exec(sql);
        this.db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(version);
      });

      transaction();
      newApplied++;
    }

    const currentVersion = this.getCurrentVersion();
    return { applied: newApplied, current: currentVersion };
  }

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  private getAppliedVersions(): Set<number> {
    const rows = this.db.prepare('SELECT version FROM _migrations').all() as Array<{ version: number }>;
    return new Set(rows.map((r) => r.version));
  }

  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) return [];
    return fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  }

  private parseVersion(filename: string): number {
    const match = filename.match(/^(\d+)/);
    if (!match) throw new Error(`Invalid migration filename: ${filename}`);
    return parseInt(match[1], 10);
  }

  private getCurrentVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) as version FROM _migrations').get() as { version: number | null };
    return row.version ?? 0;
  }
}
