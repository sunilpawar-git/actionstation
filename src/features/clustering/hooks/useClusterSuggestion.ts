/** useClusterSuggestion — orchestrates clustering pipeline with preview/accept/dismiss */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useClusterPreviewStore } from '../stores/clusterPreviewStore';
import { toast } from '@/shared/stores/toastStore';
import { clusterStrings } from '@/shared/localization/clusterStrings';
import { computeClusters } from '../services/similarityService';
import { labelClusters } from '../services/clusterLabelService';

/** Pure action callbacks — zero store subscriptions, safe for any consumer */
export function useClusterActions() {
    const suggestClusters = useCallback(async () => {
        const store = useClusterPreviewStore.getState();
        if (store.phase !== 'idle') return;

        store.setPhase('computing');
        try {
            const nodes = useCanvasStore.getState().nodes;
            const result = computeClusters(nodes);

            if (result.clusters.length === 0) {
                toast.info(clusterStrings.labels.noThemes);
                store.reset();
                return;
            }

            store.setPhase('labeling');
            const labeled = await labelClusters(result.clusters, nodes);
            store.setPreview(labeled);
        } catch (err: unknown) {
            console.error('[useClusterSuggestion] clustering failed:', err);
            toast.error(clusterStrings.labels.clusterError);
            store.reset();
        }
    }, []);

    const acceptClusters = useCallback(() => {
        const { previewGroups: groups } = useClusterPreviewStore.getState();
        if (groups) {
            useCanvasStore.getState().setClusterGroups([...groups]);
        }
        useClusterPreviewStore.getState().reset();
    }, []);

    const dismissClusters = useCallback(() => {
        useClusterPreviewStore.getState().reset();
    }, []);

    return { suggestClusters, acceptClusters, dismissClusters };
}

/** Full hook with actions + subscriptions — use only when component needs reactive phase/preview */
export function useClusterSuggestion() {
    const phase = useClusterPreviewStore((s) => s.phase);
    const previewGroups = useClusterPreviewStore((s) => s.previewGroups);
    const actions = useClusterActions();

    return { ...actions, phase, previewGroups };
}
