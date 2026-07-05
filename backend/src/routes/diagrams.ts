import { Hono } from 'hono';
import { db } from '../db.js';

interface DiagramRow {
    id: string;
    name: string;
    database_type: string;
    created_at: string;
    updated_at: string;
    data: string;
}

function rowToDiagram(row: DiagramRow) {
    return JSON.parse(row.data) as Record<string, unknown>;
}

export const diagrams = new Hono();

// GET /api/diagrams
diagrams.get('/', (c) => {
    const rows = db
        .prepare('SELECT * FROM diagrams')
        .all() as unknown as DiagramRow[];
    return c.json(rows.map(rowToDiagram));
});

// POST /api/diagrams  — create a new diagram with its full state
diagrams.post('/', async (c) => {
    const diagram = (await c.req.json()) as Record<string, unknown>;
    const id = diagram.id as string;
    const name = diagram.name as string;
    const databaseType = diagram.databaseType as string;
    const createdAt =
        typeof diagram.createdAt === 'string'
            ? diagram.createdAt
            : new Date(diagram.createdAt as string | number).toISOString();
    const updatedAt =
        typeof diagram.updatedAt === 'string'
            ? diagram.updatedAt
            : new Date(diagram.updatedAt as string | number).toISOString();

    db.prepare(
        `INSERT INTO diagrams (id, name, database_type, created_at, updated_at, data)
         VALUES (:id, :name, :databaseType, :createdAt, :updatedAt, :data)`
    ).run({
        id,
        name,
        databaseType,
        createdAt,
        updatedAt,
        data: JSON.stringify(diagram),
    });

    return c.json({ ok: true }, 201);
});

// GET /api/diagrams/:id
diagrams.get('/:id', (c) => {
    const { id } = c.req.param();
    const row = db
        .prepare('SELECT * FROM diagrams WHERE id = :id')
        .get({ id }) as unknown as DiagramRow | undefined;
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(rowToDiagram(row));
});

// PUT /api/diagrams/:id  — replace the full diagram state
diagrams.put('/:id', async (c) => {
    const { id } = c.req.param();
    const diagram = (await c.req.json()) as Record<string, unknown>;
    const name = diagram.name as string;
    const databaseType = diagram.databaseType as string;
    const createdAt =
        typeof diagram.createdAt === 'string'
            ? diagram.createdAt
            : new Date(diagram.createdAt as string | number).toISOString();
    const updatedAt =
        typeof diagram.updatedAt === 'string'
            ? diagram.updatedAt
            : new Date(diagram.updatedAt as string | number).toISOString();

    db.prepare(
        `INSERT INTO diagrams (id, name, database_type, created_at, updated_at, data)
         VALUES (:id, :name, :databaseType, :createdAt, :updatedAt, :data)
         ON CONFLICT(id) DO UPDATE SET
             name          = excluded.name,
             database_type = excluded.database_type,
             created_at    = excluded.created_at,
             updated_at    = excluded.updated_at,
             data          = excluded.data`
    ).run({
        id,
        name,
        databaseType,
        createdAt,
        updatedAt,
        data: JSON.stringify(diagram),
    });

    return c.json({ ok: true });
});

// DELETE /api/diagrams/:id
diagrams.delete('/:id', (c) => {
    const { id } = c.req.param();
    db.prepare('DELETE FROM diagrams WHERE id = :id').run({ id });
    return c.json({ ok: true });
});
