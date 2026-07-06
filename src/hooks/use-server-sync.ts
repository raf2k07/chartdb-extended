import { useEffect, useRef } from 'react';
import type { Diagram } from '@/lib/domain/diagram';
import { API_URL, USE_SERVER_STORAGE } from '@/lib/env';

/**
 * Debounced write-through sync: after every change to currentDiagram, PUT the
 * full diagram blob to the SQLite backend (500 ms debounce so rapid edits like
 * typing a field name are batched into a single request).
 *
 * This hook is a no-op when USE_SERVER_STORAGE is false, so it is safe to call
 * unconditionally from ChartDBProvider.
 *
 */
export function useServerSync(currentDiagram: Diagram): void {
    // Keep a stable ref to the latest diagram so the timeout callback always
    // captures the most recent value, not the one at scheduling time.
    const diagramRef = useRef<Diagram>(currentDiagram);
    diagramRef.current = currentDiagram;

    useEffect(() => {
        if (!USE_SERVER_STORAGE || !currentDiagram.id) return;

        const handle = setTimeout(async () => {
            const diagram = diagramRef.current;
            try {
                const res = await fetch(
                    `${API_URL}/api/diagrams/${diagram.id}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(diagram),
                    }
                );
                if (!res.ok) {
                    console.error(
                        `[server-sync] PUT /api/diagrams/${diagram.id} failed:`,
                        res.status
                    );
                }
            } catch (err) {
                console.error('[server-sync] network error:', err);
            }
        }, 500);

        return () => clearTimeout(handle);
        // We intentionally depend on currentDiagram (the whole object) so that
        // any change — including nested field edits — reschedules the debounce.
    }, [currentDiagram]);
}
