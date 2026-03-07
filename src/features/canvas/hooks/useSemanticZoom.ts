/** useSemanticZoom — sets data-zoom-level on .react-flow via imperative DOM update */
import { useEffect } from 'react';
import { useStore } from '@xyflow/react';

const HEADING_THRESHOLD = 0.5;
const DOT_THRESHOLD = 0.25;

export type ZoomLevel = 'full' | 'heading' | 'dot';

export function useSemanticZoom(): void {
    const zoom = useStore((s) => s.transform[2]);

    const level: ZoomLevel =
        zoom >= HEADING_THRESHOLD ? 'full'
            : zoom >= DOT_THRESHOLD ? 'heading'
                : 'dot';

    useEffect(() => {
        const rfWrapper = document.querySelector('.react-flow');
        rfWrapper?.setAttribute('data-zoom-level', level);
        return () => { rfWrapper?.removeAttribute('data-zoom-level'); };
    }, [level]);
}
