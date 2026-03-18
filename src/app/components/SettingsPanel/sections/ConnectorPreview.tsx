/**
 * ConnectorPreview — Inline SVG preview for connector styles.
 * Uses currentColor so it inherits from parent CSS color.
 * Derives all visual values from CONNECTOR_STYLE_DEFS — the single source of truth.
 */
import type { ConnectorStyle } from '@/shared/stores/settingsStore';
import { CONNECTOR_STYLE_DEFS } from '@/config/connectorStyleConfig';

interface ConnectorPreviewProps {
    style: ConnectorStyle;
}

export function ConnectorPreview({ style }: ConnectorPreviewProps) {
    const def = CONNECTOR_STYLE_DEFS[style];
    return (
        <svg
            width="40"
            height="12"
            aria-hidden="true"
        >
            <line
                x1="2"
                y1="6"
                x2="38"
                y2="6"
                stroke="currentColor"
                strokeWidth={def.strokeWidth !== undefined ? String(def.strokeWidth) : '2'}
                {...(def.strokeDasharray              ? { strokeDasharray: def.strokeDasharray }           : {})}
                {...(def.strokeOpacity !== undefined  ? { strokeOpacity:   String(def.strokeOpacity) }     : {})}
                {...(def.strokeLinecap                ? { strokeLinecap:   def.strokeLinecap }             : {})}
            />
        </svg>
    );
}
