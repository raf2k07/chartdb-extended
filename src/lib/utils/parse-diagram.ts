import type { Diagram } from '@/lib/domain/diagram';

/**
 * Converts a raw server JSON payload into a typed Diagram object.
 * The server stores dates as ISO strings inside the JSON blob; this
 * function parses them back into Date instances.
 */
export function parseDiagram(raw: Record<string, unknown>): Diagram {
    return {
        ...(raw as unknown as Diagram),
        createdAt: new Date(raw.createdAt as string),
        updatedAt: new Date(raw.updatedAt as string),
    };
}
