/**
 * ConfirmDialog - A global, async-compatible confirmation modal
 * Replaces window.confirm for a non-blocking, themed UX.
 */
import { useConfirmStore } from '@/shared/stores/confirmStore';
import { strings } from '@/shared/localization/strings';

/** Global async-compatible confirmation modal; themed replacement for window.confirm. */
export function ConfirmDialog() {
    const isOpen = useConfirmStore((s) => s.isOpen);
    const options = useConfirmStore((s) => s.options);

    if (!isOpen || !options) return null;

    const handleConfirm = () => useConfirmStore.getState().handleConfirm();
    const handleCancel = () => useConfirmStore.getState().handleCancel();

    const {
        title,
        message,
        confirmText = strings.common.confirm,
        cancelText = strings.common.cancel,
        isDestructive = false,
    } = options;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-[var(--z-modal)] animate-[fadeIn_0.15s_ease-out_forwards]"
            onClick={handleCancel}
            role="presentation"
        >
            <div
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-xl)] max-w-[400px] w-[90%] animate-[slideUpSmall_0.15s_ease-out_forwards]"
                style={{ padding: 'var(--space-xl)' }}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-title" className="font-semibold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 8 }}>{title}</h2>
                <p id="confirm-message" className="text-[var(--color-text-secondary)] leading-normal" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xl)' }}>{message}</p>
                <div className="flex justify-end" style={{ gap: 8 }}>
                    <button
                        className="rounded-md font-medium text-[var(--color-text-secondary)] transition-all duration-150 ease-in-out hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                        style={{ background: 'transparent', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', padding: '8px 24px' }}
                        onClick={handleCancel}
                        autoFocus
                    >
                        {cancelText}
                    </button>
                    <button
                        className="rounded-md font-medium text-[var(--color-text-on-primary)] transition-colors duration-150 ease-in-out"
                        style={{ background: isDestructive ? 'var(--color-error)' : 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: '8px 24px' }}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
