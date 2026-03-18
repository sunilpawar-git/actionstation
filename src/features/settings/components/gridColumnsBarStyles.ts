/**
 * Inline style helpers for GridColumnsControl preview bars.
 *
 * Replaces CSS nth-child / data-attribute selectors that aren't
 * expressible in Tailwind utility classes.
 */
import type { GridColumnsPreference } from '@/features/canvas/services/gridColumnsResolver';
import type { CSSProperties } from 'react';

const AUTO_BAR_CONFIGS: ReadonlyArray<{ height: string; opacity: number }> = [
    { height: '60%', opacity: 0.5 },
    { height: '80%', opacity: 0.7 },
    { height: '50%', opacity: 0.45 },
    { height: '70%', opacity: 0.6 },
];

export function getBarStyle(
    value: GridColumnsPreference,
    index: number,
): CSSProperties {
    if (value === 'auto') {
        const fallback = { height: '60%', opacity: 0.5 };
        const cfg = AUTO_BAR_CONFIGS[index] ?? fallback;
        return {
            height: cfg.height,
            opacity: cfg.opacity,
            background: 'linear-gradient(to bottom, var(--color-primary), var(--color-primary-light))',
        };
    }

    const isOdd = index % 2 === 0; // nth-child is 1-indexed, JS index is 0-indexed
    return {
        height: isOdd ? '72%' : '55%',
        opacity: isOdd ? 0.75 : 0.45,
        background: 'var(--color-primary)',
    };
}
