/**
 * TileErrorBanner — shown when one or more spatial tiles failed to load.
 * Provides a retry button that re-dispatches load for all failed tiles.
 * Uses CSS variables for theming; inline style for spacing.
 */
import { useTileErrorState } from '@/features/workspace/hooks/useTileErrorState';
import { strings } from '@/shared/localization/strings';

export function TileErrorBanner() {
    const { errorTileIds, retry } = useTileErrorState();

    if (errorTileIds.length === 0) return null;

    return (
        <div
            role="region"
            aria-label={`${strings.workspace.tileLoadFailed} (${errorTileIds.length})`}
            style={{
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error-text)',
                padding: 'var(--space-sm) var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                fontSize: '0.875rem',
                fontWeight: 500,
                zIndex: 999,
            }}
        >
            <span style={{ flex: 1 }}>
                {strings.workspace.tileLoadFailed} ({errorTileIds.length})
            </span>
            <button
                type="button"
                onClick={retry}
                style={{
                    background: 'var(--color-error-text)',
                    color: 'var(--color-error-bg)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                }}
            >
                {strings.workspace.tileLoadRetry}
            </button>
        </div>
    );
}
