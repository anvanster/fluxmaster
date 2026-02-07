import Database from 'better-sqlite3';
import { Migrator } from './migrator.js';

export interface DatabaseManagerOptions {
  walMode?: boolean;
}

export class DatabaseManager {
  private db: Database.Database;
  private _isOpen: boolean;

  constructor(dbPath: string, options?: DatabaseManagerOptions) {
    this.db = new Database(dbPath);
    this._isOpen = true;

    if (options?.walMode !== false) {
      this.db.pragma('journal_mode = WAL');
    }
    this.db.pragma('foreign_keys = ON');
  }

  get connection(): Database.Database {
    return this.db;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  migrate(migrationsDir?: string): void {
    const migrator = new Migrator(this.db, migrationsDir);
    migrator.run();
  }

  close(): void {
    if (this._isOpen) {
      this.db.close();
      this._isOpen = false;
    }
  }
}
