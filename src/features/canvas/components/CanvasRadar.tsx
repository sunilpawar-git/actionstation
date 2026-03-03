/**
 * Canvas Radar — squircle minimap showing node positions as red dots.
 * Reads node positions from Zustand store (not ReactFlow hooks),
 * keeping it fully isolated from the ReactFlow render cycle.
 */
import { memo, useMemo, useCallback, useId } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { computeBoundingBox, createRadarTransform, normalizePositions } from './radarHelpers';
import { ViewportIndicator } from './ViewportIndicator';
import { strings } from '@/shared/localization/strings';
import styles from './CanvasRadar.module.css';

/** Radar squircle size in pixels (matches ZoomControls button width) */
const RADAR_SIZE = 32;

/** SVG dot radius for each node */
const DOT_RADIUS = 2;

/** Stable selector — extracts only what the radar needs */
function selectNodes(s: { nodes: Array<{ position: { x: number; y: number } }> }) {
    return s.nodes;
}

export const CanvasRadar = memo(function CanvasRadar() {
    const nodes = useCanvasStore(selectNodes);
    const { fitView } = useReactFlow();
    const filterId = useId();

    const { transform, dots } = useMemo(() => {
        const positions = nodes.map((n) => n.position);
        const bbox = computeBoundingBox(positions);
        if (!bbox) return { transform: null, dots: [] };
        const t = createRadarTransform(bbox, RADAR_SIZE);
        return { transform: t, dots: normalizePositions(positions, t, RADAR_SIZE) };
    }, [nodes]);

    const handleClick = useCallback(() => {
        void fitView({ padding: 0.2, duration: 300 });
    }, [fitView]);

    const label = strings.canvas.zoomControls.radarLabel;

    return (
        <button
            className={styles.radar}
            onClick={handleClick}
            aria-label={label}
            title={label}
            data-testid="canvas-radar"
        >
            <svg
                width={RADAR_SIZE}
                height={RADAR_SIZE}
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                role="img"
                aria-hidden="true"
            >
                <defs>
                    <filter id={filterId}>
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {dots.map((dot, i) => (
                    <circle
                        key={i}
                        cx={dot.x}
                        cy={dot.y}
                        r={DOT_RADIUS}
                        className={styles.dot}
                        filter={`url(#${filterId})`}
                    />
                ))}
                <ViewportIndicator transform={transform} radarSize={RADAR_SIZE} />
            </svg>
        </button>
    );
});
