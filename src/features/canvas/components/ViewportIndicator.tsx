/**
 * ViewportIndicator — Renders the "camera" rectangle on the Canvas Radar.
 *
 * ISOLATION: This component subscribes to ReactFlow's internal store via
 * scalar useStore selectors (transform[0], transform[1], transform[2],
 * width, height). Only this <rect> re-renders during 60fps pan/zoom —
 * the parent CanvasRadar (with its node dots) is untouched.
 */
import { memo, useMemo } from 'react';
import { useStore } from '@xyflow/react';
import { mapViewportToRadar } from './radarHelpers';
import type { RadarTransform } from './radarHelpers';
import styles from './CanvasRadar.module.css';

/** Scalar selectors — each returns a primitive, preventing object churn */
const selectX = (s: { transform: [number, number, number] }) => s.transform[0];
const selectY = (s: { transform: [number, number, number] }) => s.transform[1];
const selectZoom = (s: { transform: [number, number, number] }) => s.transform[2];
const selectWidth = (s: { width: number }) => s.width;
const selectHeight = (s: { height: number }) => s.height;

interface ViewportIndicatorProps {
    transform: RadarTransform | null;
    radarSize: number;
}

export const ViewportIndicator = memo(function ViewportIndicator({
    transform,
    radarSize,
}: ViewportIndicatorProps) {
    const vpX = useStore(selectX);
    const vpY = useStore(selectY);
    const zoom = useStore(selectZoom);
    const containerW = useStore(selectWidth);
    const containerH = useStore(selectHeight);

    const rect = useMemo(() => {
        if (!transform || containerW === 0 || containerH === 0) return null;
        return mapViewportToRadar(vpX, vpY, zoom, containerW, containerH, transform, radarSize);
    }, [vpX, vpY, zoom, containerW, containerH, transform, radarSize]);

    if (!rect || rect.w === 0 || rect.h === 0) return null;

    return (
        <rect
            className={styles.viewportRect}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            data-testid="viewport-indicator"
        />
    );
});
