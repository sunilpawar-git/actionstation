import { useCallback } from 'react';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { markChangelogSeen } from '../services/changelogService';
import { changelogStrings } from '../strings/changelogStrings';
import { CHANGELOG_ENTRIES } from '../data/changelogEntries';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: Props) {
    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);

    const handleDismiss = useCallback(() => {
        markChangelogSeen();
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'var(--color-overlay)' }}
            onClick={handleDismiss}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={changelogStrings.title}
                className="relative bg-[var(--color-surface)] rounded-xl overflow-clip w-full max-w-lg"
                style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    aria-label={changelogStrings.closeLabel}
                    className="absolute top-3 right-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    onClick={onClose}
                >×</button>

                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]"
                    style={{ marginBottom: '16px' }}>
                    {changelogStrings.title}
                </h2>

                <ul className="flex flex-col" style={{ gap: '16px', listStyle: 'none' }}>
                    {CHANGELOG_ENTRIES.map((entry) => (
                        <li key={entry.version}>
                            <strong className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {entry.date}
                            </strong>
                            <ul className="flex flex-col" style={{ gap: '4px', marginTop: '4px', listStyle: 'disc', paddingLeft: '18px' }}>
                                {entry.items.map((item, idx) => (
                                    <li key={`${entry.version}-${idx}`} className="text-sm text-[var(--color-text-secondary)]">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>

                <div style={{ marginTop: '20px' }}>
                    <button
                        onClick={handleDismiss}
                        className="rounded font-medium text-sm"
                        style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', border: 'none', cursor: 'pointer' }}
                    >
                        {changelogStrings.dismiss}
                    </button>
                </div>
            </div>
        </div>
    );
}
