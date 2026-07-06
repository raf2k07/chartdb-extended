import { useEffect, useState } from 'react';
import type { StorageContext } from '@/context/storage-context/storage-context';
import { API_URL, USE_SERVER_STORAGE } from '@/lib/env';
import { parseDiagram } from '@/lib/utils/parse-diagram';

/**
 * One-time startup hydration: fetch all diagrams from the SQLite backend and
 * upsert them into Dexie so that every new browser tab starts with the
 * server-authoritative state rather than whatever stale IndexedDB data was left
 * from a previous session.
 *
 * Strategy — delete + re-add per diagram:
 *   A plain "update" of diagram metadata would leave orphaned tables /
 *   relationships that were deleted in another tab. Deleting first and then
 *   re-adding the full diagram (which includes all sub-entities) ensures Dexie
 *   is an exact mirror of the server blob.
 *
 * Fallback:
 *   If the server is unreachable, hydration completes immediately (hydrated=true)
 *   and the existing Dexie data is used. This keeps the app functional offline.
 *
 * This hook is a no-op (hydrated=true immediately) when USE_SERVER_STORAGE is
 * false, so it is safe to call unconditionally from useDiagramLoader.
 */
export function useServerHydration(storage: StorageContext): {
    hydrated: boolean;
} {
    // When server storage is disabled, skip hydration entirely.
    const [hydrated, setHydrated] = useState(!USE_SERVER_STORAGE);

    useEffect(() => {
        if (!USE_SERVER_STORAGE) return;

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/diagrams`);
                if (!res.ok) throw new Error(`Server responded ${res.status}`);

                const raws = (await res.json()) as Record<string, unknown>[];
                const diagrams = raws.map(parseDiagram);

                for (const diagram of diagrams) {
                    if (cancelled) return;

                    // Delete first so that sub-entities removed in another tab
                    // are not left behind in IndexedDB.
                    try {
                        await storage.deleteDiagram(diagram.id);
                    } catch {
                        // Diagram may not exist locally yet — that is fine.
                    }

                    await storage.addDiagram({ diagram });
                }

                // Sync the config: pull the server's defaultDiagramId and apply
                // it to Dexie so the correct diagram opens automatically.
                try {
                    const cfgRes = await fetch(`${API_URL}/api/config`);
                    if (cfgRes.ok) {
                        const cfg = (await cfgRes.json()) as {
                            defaultDiagramId?: string;
                        } | null;
                        if (cfg?.defaultDiagramId) {
                            await storage.updateConfig({
                                defaultDiagramId: cfg.defaultDiagramId,
                            });
                        }
                    }
                } catch {
                    // Config sync failure is non-fatal.
                }
            } catch (err) {
                console.warn(
                    '[server-hydration] Server unreachable, using local Dexie state:',
                    err
                );
            } finally {
                if (!cancelled) setHydrated(true);
            }
        })();

        return () => {
            cancelled = true;
        };
        // storage is stable (created once in StorageProvider) so this runs once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { hydrated };
}
