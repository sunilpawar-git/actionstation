/**
 * Toast Container Component - Renders notifications
 */
import { useCallback } from 'react';
import clsx from 'clsx';
import { useToastStore } from '../stores/toastStore';
import type { ToastType } from '../stores/toastStore';

const toastTypeClasses: Record<ToastType, string> = {
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
    error:   'bg-[var(--color-error-bg)] text-[var(--color-error-text)]',
    info:    'bg-[var(--color-info-bg)] text-[var(--color-info-text)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]',
};

/** Renders the stack of active toast notifications anchored to the bottom-centre of the viewport. */
export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    const handleRemove = useCallback((id: string) => {
        useToastStore.getState().removeToast(id);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-[var(--space-xl)] left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex flex-col" style={{ gap: 8 }}>
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={clsx(
                        'flex items-center rounded-xl shadow-[var(--shadow-lg)] animate-[slideUpSmall_0.3s_ease] min-w-[300px] max-w-[500px]',
                        toastTypeClasses[t.type]
                    )}
                    style={{ gap: 16, padding: '16px 24px' }}
                >
                    <span className="flex-1" style={{ fontSize: 'var(--font-size-sm)' }}>{t.message}</span>
                    {t.action && (
                        <button
                            className="font-semibold underline text-inherit opacity-90 rounded-sm whitespace-nowrap cursor-pointer hover:opacity-100 hover:bg-white/15"
                            style={{ fontSize: 'var(--font-size-sm)', padding: '4px 8px' }}
                            onClick={() => { t.action?.onClick(); handleRemove(t.id); }}
                        >
                            {t.action.label}
                        </button>
                    )}
                    <button
                        className="opacity-70 p-0 leading-none text-inherit hover:opacity-100"
                        style={{ fontSize: 'var(--font-size-lg)' }}
                        onClick={() => handleRemove(t.id)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
