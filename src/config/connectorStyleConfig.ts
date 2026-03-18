/**
 * connectorStyleConfig — Single source of truth for connector style visual definitions.
 *
 * Both the live canvas edge (DeletableEdge) and the settings preview (ConnectorPreview)
 * derive their visual properties from this record. Adding or changing a style is a
 * one-line edit here; both surfaces update automatically.
 *
 * Values are numeric so consumers can use them directly as CSS / SVG attributes
 * without string-to-number conversion.
 */
import type { ConnectorStyle } from '@/shared/stores/settingsStore';

export interface EdgeStyleDef {
    /** SVG stroke-opacity (0–1). Omit for full opacity. */
    strokeOpacity?: number;
    /** SVG stroke-width in px. Omit to inherit ReactFlow default (≈1). */
    strokeWidth?: number;
    /** SVG stroke-dasharray value, e.g. '6 6'. Omit for solid line. */
    strokeDasharray?: string;
    /** SVG stroke-linecap. Omit for default ('butt'). */
    strokeLinecap?: 'round' | 'butt' | 'square';
}

export const CONNECTOR_STYLE_DEFS: Record<ConnectorStyle, EdgeStyleDef> = {
    ghost:   { strokeOpacity: 0.22, strokeWidth: 0.75 },
    regular: { strokeWidth: 2 },
    light:   { strokeOpacity: 0.5,  strokeWidth: 1 },
    bold:    { strokeWidth: 4 },
    dashed:  { strokeWidth: 2, strokeDasharray: '6 6' },
    dotted:  { strokeWidth: 2, strokeDasharray: '2 6', strokeLinecap: 'round' },
};
