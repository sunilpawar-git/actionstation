import { useState, useCallback } from 'react';
import type React from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { feedbackStrings } from '../strings/feedbackStrings';
import { submitFeedback } from '../services/feedbackService';
import { logger } from '@/shared/services/logger';
import type { FeedbackType } from '../types/feedback';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface FormBodyProps {
    readonly type: FeedbackType;
    readonly message: string;
    readonly status: Status;
    readonly onTypeChange: (t: FeedbackType) => void;
    readonly onMessageChange: (m: string) => void;
    readonly onSubmit: () => void;
}

function FeedbackFormBody({ type, message, status, onTypeChange, onMessageChange, onSubmit }: FormBodyProps): React.ReactElement {
    const canSubmit = message.trim().length >= 10 && status === 'idle';
    return (
        <div className="flex flex-col" style={{ gap: '12px' }}>
            <div className="flex flex-col" style={{ gap: '4px' }}>
                <label htmlFor="fb-type" className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {feedbackStrings.typeLabel}
                </label>
                <select
                    id="fb-type"
                    value={type}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-sm"
                    style={{ padding: '6px 8px' }}
                    onChange={(e) => { onTypeChange(e.target.value as FeedbackType); }}
                >
                    <option value="general">{feedbackStrings.types.general}</option>
                    <option value="bug">{feedbackStrings.types.bug}</option>
                    <option value="feature">{feedbackStrings.types.feature}</option>
                </select>
            </div>
            <div className="flex flex-col" style={{ gap: '4px' }}>
                <label htmlFor="fb-message" className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {feedbackStrings.messageLabel}
                </label>
                <textarea
                    id="fb-message"
                    value={message}
                    placeholder={feedbackStrings.messagePlaceholder}
                    rows={4}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-sm resize-none"
                    style={{ padding: '8px' }}
                    onChange={(e) => { onMessageChange(e.target.value); }}
                />
            </div>
            <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="w-full rounded font-medium text-sm"
                style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5 }}
            >
                {status === 'submitting' ? feedbackStrings.submitting : feedbackStrings.submit}
            </button>
        </div>
    );
}

export function FeedbackDialog({ isOpen, onClose }: Props) {
    const userId = useAuthStore((s) => s.user?.id ?? '');
    const [type, setType] = useState<FeedbackType>('general');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<Status>('idle');

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);

    const handleSubmit = useCallback(() => {
        setStatus('submitting');
        submitFeedback(userId, type, message)
            .then(() => {
                setStatus('success');
                setMessage('');
            })
            .catch((err: unknown) => {
                logger.error('FeedbackDialog submit failed', err);
                setStatus('error');
            });
    }, [userId, type, message]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'var(--color-overlay)' }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={feedbackStrings.title}
                className="relative bg-[var(--color-surface)] rounded-xl overflow-clip w-full max-w-md"
                style={{ padding: '24px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    aria-label={feedbackStrings.closeLabel}
                    className="absolute top-3 right-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                    onClick={onClose}
                >×</button>

                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]"
                    style={{ marginBottom: '16px' }}>
                    {feedbackStrings.title}
                </h2>

                {status === 'success' && (
                    <p className="text-sm text-[var(--color-text-secondary)]">{feedbackStrings.successMessage}</p>
                )}
                {status === 'error' && (
                    <p role="alert" className="text-sm" style={{ color: 'var(--color-error, #e53e3e)' }}>
                        {feedbackStrings.errorMessage}
                    </p>
                )}
                {status !== 'success' && (
                    <FeedbackFormBody
                        type={type}
                        message={message}
                        status={status}
                        onTypeChange={setType}
                        onMessageChange={setMessage}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </div>
    );
}
