/**
 * MultiTabBanner — shown to follower tabs to warn that another tab is the leader.
 * Renders nothing when this tab is the leader or role is still pending.
 * Uses CSS variables for theming; inline style for spacing (global reset safety).
 */
import { useTabLeaderState } from '@/shared/contexts/TabLeaderContext';
import { strings } from '@/shared/localization/strings';

export function MultiTabBanner() {
    const { isLeader, role } = useTabLeaderState();

    if (isLeader || role !== 'follower') return null;

    return (
        <div
            role="region"
            aria-label={strings.multiTab.ariaLabel}
            style={{
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning-text)',
                padding: 'var(--space-sm) var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                fontSize: '0.875rem',
                fontWeight: 500,
                zIndex: 1000,
            }}
        >
            <span style={{ flex: 1 }}>{strings.multiTab.anotherTabOpen}</span>
            <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                    background: 'var(--color-warning-text)',
                    color: 'var(--color-warning-bg)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                }}
            >
                {strings.multiTab.takeOver}
            </button>
        </div>
    );
}
