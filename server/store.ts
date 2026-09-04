import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import Database from 'better-sqlite3';

export interface PersistedEngineState {
  killSwitchActive: boolean;
  dryRunActive: boolean;
  mockedClockTime: number;
  processedWebhooks: string[];
  executedActionKeys: string[];
  suppressionList: string[];
  cases: unknown[];
  auditLogs: unknown[];
}

/** A single-row SQLite snapshot keeps the demo self-contained and restart-safe. */
export class RecoveryStore {
  private db: DatabaseSync;

  constructor(file = path.join(process.cwd(), 'data', 'revrecover.sqlite')) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('CREATE TABLE IF NOT EXISTS engine_snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  }

  load(): PersistedEngineState | undefined {
    const row = this.db.prepare('SELECT payload FROM engine_snapshot WHERE id = 1').get() as { payload?: string } | undefined;
    return row?.payload ? JSON.parse(row.payload) as PersistedEngineState : undefined;
  }

  save(state: PersistedEngineState): void {
    this.db.prepare('INSERT INTO engine_snapshot (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at')
      .run(JSON.stringify(state), Math.floor(Date.now() / 1000));
  }

  clear(): void { this.db.exec('DELETE FROM engine_snapshot'); }
}

/**
 * Operational tables live alongside the legacy snapshot during the migration.
 * The snapshot keeps the existing simulator restart-safe; these tables provide
 * transactional action, attribution, and experiment-run records.
 */
export function openOperationalDatabase(file = path.join(process.cwd(), 'data', 'revrecover.sqlite')): Database.Database {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8'));
  return db;
}
