/**
 * useAutosave Hook - Debounce scheduling for autosave
 * Delegates save logic to useSaveCallback; handles change detection and timing.
 */
import { useEffect, useRef } from 'react';
import { useSaveCallback, serializeWorkspacePoolFields } from './useSaveCallback';

const AUTOSAVE_DELAY_MS = 2000;
const POSITION_SAVE_DELAY_MS = 5000;

export function useAutosave(workspaceId: string, isWorkspaceLoading: boolean = false) {
    const {
        save, nodes, edges, currentWorkspace,
        timeoutRef, lastPersistedWorkspaceRef,
    } = useSaveCallback(workspaceId);
    const lastSavedRef = useRef({ nodes: '', edges: '', workspace: '', positions: '' });

    useEffect(() => {
        const contentJson = JSON.stringify(
            nodes.map((n) => ({
                id: n.id,
                data: n.data,
                width: n.width,
                height: n.height,
            }))
        );
        const positionJson = JSON.stringify(
            nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))
        );
        const edgesJson = JSON.stringify(edges);
        const workspaceJson = serializeWorkspacePoolFields(currentWorkspace);

        const contentChanged = contentJson !== lastSavedRef.current.nodes ||
            edgesJson !== lastSavedRef.current.edges ||
            workspaceJson !== lastSavedRef.current.workspace;
        const positionChanged = positionJson !== lastSavedRef.current.positions;

        if (!contentChanged && !positionChanged) return;

        if (isWorkspaceLoading) {
            lastSavedRef.current = {
                nodes: contentJson, edges: edgesJson, workspace: workspaceJson, positions: positionJson,
            };
            lastPersistedWorkspaceRef.current = workspaceJson;
            return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const delay = contentChanged ? AUTOSAVE_DELAY_MS : POSITION_SAVE_DELAY_MS;
        timeoutRef.current = setTimeout(() => {
            lastSavedRef.current = {
                nodes: contentJson, edges: edgesJson, workspace: workspaceJson, positions: positionJson,
            };
            void save();
        }, delay);

        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // timeoutRef and lastPersistedWorkspaceRef are stable useRef objects -- excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, currentWorkspace, save, isWorkspaceLoading, workspaceId]);
}
