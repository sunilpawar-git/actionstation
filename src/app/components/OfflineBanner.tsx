/**
 * OfflineBanner - Dismissible banner shown when user is offline
 * Shows offline message + pending queue count.
 * All text from strings.offline.* — no hardcoded strings.
 */
import { useState, useEffect } from 'react';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { strings } from '@/shared/localization/strings';

/** Dismissible banner shown at the top of the canvas when the network is offline. */
export function OfflineBanner() {
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
    const [isDismissed, setIsDismissed] = useState(false);

    // Reset dismissed state when going back online (so it reappears on next offline)
    useEffect(() => {
        if (isOnline) {
            setIsDismissed(false);
        }
    }, [isOnline]);

    // Don't render when online or dismissed
    if (isOnline || isDismissed) {
        return null;
    }

    return (
        <div
            className="flex items-center justify-between border-b text-sm animate-[slideDown_150ms_ease]"
            style={{
                padding: '4px 16px',
                background: 'var(--offline-banner-bg, hsl(38, 90%, 95%))',
                color: 'var(--offline-banner-text, hsl(38, 80%, 20%))',
                borderBottomColor: 'var(--offline-banner-border, hsl(38, 70%, 80%))',
            }}
        >
            <span className="flex-1">
                {strings.offline.offlineBanner}
                {pendingCount > 0 && (
                    <span className="opacity-80">
                        {' · '}{pendingCount} {strings.offline.pendingSync}
                    </span>
                )}
            </span>
            <button
                className="text-xs underline opacity-70 transition-opacity duration-150 ease-in-out hover:opacity-100"
                style={{ padding: 4, color: 'var(--offline-banner-text, hsl(38, 80%, 20%))' }}
                onClick={() => setIsDismissed(true)}
            >
                {strings.offline.dismiss}
            </button>
        </div>
    );
}
