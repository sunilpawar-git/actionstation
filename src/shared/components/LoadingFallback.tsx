/**
 * Loading Fallback - Suspense boundary fallback component
 * Used for lazy-loaded components
 */
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';

interface LoadingFallbackProps {
    /** Optional custom message */
    message?: string;
    /** Full screen overlay mode */
    fullScreen?: boolean;
}

/** Suspense boundary fallback showing a spinner and message; supports optional full-screen overlay. */
export function LoadingFallback({ 
    message = strings.common.loadingComponent, 
    fullScreen = false 
}: LoadingFallbackProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center min-h-[200px]',
                fullScreen && 'fixed inset-0 min-h-screen bg-[var(--color-background)] z-[var(--z-modal)]'
            )}
            style={{ gap: 16, padding: 'var(--space-xl)' }}
        >
            <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
            <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>{message}</p>
        </div>
    );
}
