/** ClusterOverlay — committed boundaries + preview boundaries + preview bar */
import React from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useClusterPreviewStore } from '../stores/clusterPreviewStore';
import { useClusterActions } from '../hooks/useClusterSuggestion';
import { ClusterBoundaries } from './ClusterBoundaries';
import { ClusterPreviewBar } from './ClusterPreviewBar';

export const ClusterOverlay = React.memo(function ClusterOverlay() {
    const nodes = useCanvasStore((s) => s.nodes);
    const clusterGroups = useCanvasStore((s) => s.clusterGroups);
    const phase = useClusterPreviewStore((s) => s.phase);
    const previewGroups = useClusterPreviewStore((s) => s.previewGroups);
    const { acceptClusters, dismissClusters } = useClusterActions();

    return (
        <>
            {clusterGroups.length > 0 && (
                <ClusterBoundaries clusters={clusterGroups} nodes={nodes} />
            )}
            {previewGroups && (
                <ClusterBoundaries clusters={previewGroups} nodes={nodes} variant="preview" />
            )}
            <ClusterPreviewBar
                phase={phase}
                previewGroups={previewGroups}
                onAccept={acceptClusters}
                onDismiss={dismissClusters}
            />
        </>
    );
});
