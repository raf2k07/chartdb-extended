import { Hono } from 'hono';
import { db } from '../db.js';

interface ConfigRow {
    id: number;
    default_diagram_id: string;
    export_actions: string | null;
}

function rowToConfig(row: ConfigRow) {
    return {
        defaultDiagramId: row.default_diagram_id,
        exportActions: row.export_actions
            ? (JSON.parse(row.export_actions) as string[])
            : undefined,
    };
}

export const config = new Hono();

// GET /api/config
config.get('/', (c) => {
    const row = db
        .prepare('SELECT * FROM config WHERE id = 1')
        .get() as unknown as ConfigRow | undefined;
    return c.json(row ? rowToConfig(row) : null);
});

// PATCH /api/config
config.patch('/', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const sets: string[] = [];
    const params: Record<string, string | null> = {};

    if ('defaultDiagramId' in body) {
        sets.push('default_diagram_id = :default_diagram_id');
        params.default_diagram_id = body.defaultDiagramId as string;
    }
    if ('exportActions' in body) {
        sets.push('export_actions = :export_actions');
        params.export_actions =
            body.exportActions != null
                ? JSON.stringify(body.exportActions)
                : null;
    }

    if (sets.length > 0) {
        db.prepare(`UPDATE config SET ${sets.join(', ')} WHERE id = 1`).run(
            params
        );
    }

    return c.json({ ok: true });
});
