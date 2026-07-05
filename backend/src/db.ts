import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'chartdb.db');

export const db = new DatabaseSync(DB_PATH);

// WAL mode for better concurrent read performance
db.exec('PRAGMA journal_mode = WAL');

// ─── diagrams ────────────────────────────────────────────────────────────────
// Flat metadata columns are kept for fast listing without JSON parsing.
// `data` holds the full Diagram object (tables, relationships, areas, etc.)
// serialised as JSON.
db.exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        database_type TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        data          TEXT NOT NULL
    )
`);

// ─── config ──────────────────────────────────────────────────────────────────
// Singleton row (id = 1).
// `export_actions` is a JSON array of ISO date strings.
db.exec(`
    CREATE TABLE IF NOT EXISTS config (
        id                 INTEGER PRIMARY KEY,
        default_diagram_id TEXT    NOT NULL DEFAULT '',
        export_actions     TEXT
    )
`);

// Seed the singleton config row on first run
const configRow = db.prepare('SELECT id FROM config WHERE id = 1').get() as
    | { id: number }
    | undefined;

if (!configRow) {
    db.prepare(
        "INSERT INTO config (id, default_diagram_id) VALUES (1, '')"
    ).run();
}
