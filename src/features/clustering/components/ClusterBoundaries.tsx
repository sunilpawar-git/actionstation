/** ClusterBoundaries — renders translucent cluster boundaries as ReactFlow sibling */
import React, { useMemo } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';
import type { CanvasNode } from '@/features/canvas/types/node';
import clsx from 'clsx';
import type { ClusterGroup, ClusterBounds } from '../types/cluster';

/** Scalar selectors — each returns a primitive, preventing object-reference churn during pan/zoom */
const selectTx = (s: ReactFlowState) => s.transform[0];
const selectTy = (s: ReactFlowState) => s.transform[1];
const selectScale = (s: ReactFlowState) => s.transform[2];

interface ClusterBoundariesProps {
    readonly clusters: readonly ClusterGroup[];
    readonly nodes: readonly CanvasNode[];
    readonly variant?: 'committed' | 'preview';
}

const PADDING = 40;
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;

/** Computes the padded bounding rectangle for a set of cluster nodes, or null if the set is empty. */
function computeBoundsFromNodes(
    nodeIds: readonly string[],
    nodeMap: ReadonlyMap<string, CanvasNode>,
): ClusterBounds | null {
    const clusterNodes = nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is CanvasNode => n != null);
    if (clusterNodes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of clusterNodes) {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.y < minY) minY = n.position.y;
        const right = n.position.x + (n.width ?? DEFAULT_WIDTH);
        const bottom = n.position.y + (n.height ?? DEFAULT_HEIGHT);
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
    }

    return {
        x: minX - PADDING, y: minY - PADDING,
        width: maxX - minX + 2 * PADDING, height: maxY - minY + 2 * PADDING,
    };
}

/** Renders translucent cluster boundary overlays as a ReactFlow sibling layer. */
export const ClusterBoundaries = React.memo(function ClusterBoundaries({
    clusters,
    nodes,
    variant = 'committed',
}: ClusterBoundariesProps) {
    const tx = useStore(selectTx);
    const ty = useStore(selectTy);
    const scale = useStore(selectScale);
    const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

    const clustersWithBounds = useMemo(
        () =>
            clusters
                .map((cluster) => ({
                    ...cluster,
                    bounds: computeBoundsFromNodes(cluster.nodeIds, nodeMap),
                }))
                .filter((c): c is typeof c & { bounds: ClusterBounds } => c.bounds !== null),
        [clusters, nodeMap],
    );

    if (clustersWithBounds.length === 0) return null;

    return (
        <div
            className="absolute top-0 left-0 pointer-events-none z-0"
            style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: '0 0',
            }}
        >
            {clustersWithBounds.map((cluster) => (
                <div
                    key={cluster.id}
                    className={clsx(
                        'absolute bg-[color-mix(in_oklch,var(--cluster-hue)_8%,transparent)] border border-[color-mix(in_oklch,var(--cluster-hue)_30%,transparent)] rounded-[var(--cluster-boundary-radius)] transition-opacity duration-150 ease-in-out',
                        variant === 'preview' && 'border-dashed border-2'
                    )}
                    style={{
                        left: `${cluster.bounds.x}px`,
                        top: `${cluster.bounds.y}px`,
                        width: `${cluster.bounds.width}px`,
                        height: `${cluster.bounds.height}px`,
                        '--cluster-hue': `var(--cluster-color-${cluster.colorIndex + 1})`,
                    } as React.CSSProperties}
                    role="group"
                    aria-label={cluster.label}
                >
                    <span className="absolute top-[calc(-1*var(--space-lg))] left-2 text-[var(--color-text-secondary)] opacity-[var(--cluster-label-opacity)] whitespace-nowrap select-none" style={{ fontSize: 'var(--font-size-sm)' }}>{cluster.label}</span>
                </div>
            ))}
        </div>
    );
});
