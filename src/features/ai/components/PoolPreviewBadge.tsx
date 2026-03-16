/**
 * PoolPreviewBadge — Shows pooled node count as a small amber badge.
 * Renders nothing when count is 0. Used near AI-related controls
 * to indicate how many memory nodes will be used.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';

interface PoolPreviewBadgeProps {
    pooledCount: number;
    totalCount: number;
}

/** Amber badge showing the pooled node count; renders nothing when the count is zero. */
export const PoolPreviewBadge = React.memo(function PoolPreviewBadge({
    pooledCount,
    totalCount,
}: PoolPreviewBadgeProps) {
    if (pooledCount === 0) return null;

    return (
        <span
            className="absolute -top-1 -right-1 min-w-4 h-4 rounded-lg bg-[var(--color-pool-active)] text-[var(--color-text-on-primary)] text-[10px] font-semibold leading-[16px] text-center pointer-events-none shadow-[0_1px_3px_hsla(0,0%,0%,0.2)]"
            style={{ paddingLeft: 4, paddingRight: 4 }}
            aria-label={strings.nodePool.poolPreview(pooledCount, totalCount)}
            title={strings.nodePool.poolPreview(pooledCount, totalCount)}
        >
            {pooledCount}
        </span>
    );
});
