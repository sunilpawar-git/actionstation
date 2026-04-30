import { useState, useCallback } from 'react';
import { createSnapshot } from '../services/snapshotService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { toast } from '@/shared/stores/toastStore';
import { logger } from '@/shared/services/logger';
import { strings } from '@/shared/localization/strings';

type DialogStep = 'idle' | 'creating' | 'ready';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function buildShareUrl(snapshotId: string): string {
    return `${window.location.origin}/view/${snapshotId}`;
}

export function ShareCanvasDialog({ isOpen, onClose }: Props) {
    const [step, setStep] = useState<DialogStep>('idle');
    const [shareUrl, setShareUrl] = useState('');

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);

    const userId = useAuthStore((s) => s.user?.id ?? null);
    const workspaceName = useWorkspaceStore(
        (s) => s.workspaces.find((w) => w.id === s.currentWorkspaceId)?.name ?? strings.snapshot.untitledWorkspace
    );

    const handleCreate = useCallback(() => {
        if (!userId || step === 'creating') return;
        setStep('creating');
        const { nodes, edges } = useCanvasStore.getState();
        createSnapshot(userId, workspaceName, nodes, edges)
            .then((id) => {
                setShareUrl(buildShareUrl(id));
                setStep('ready');
            })
            .catch((err: unknown) => {
                logger.error('[ShareCanvasDialog] createSnapshot failed', err);
                toast.error(strings.snapshot.errorCreating);
                setStep('idle');
            });
    }, [userId, workspaceName, step]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(shareUrl).catch((err: unknown) => {
            logger.error('[ShareCanvasDialog] clipboard failed', err);
        });
    }, [shareUrl]);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--color-overlay)' }} onClick={onClose} />
            <div className="relative" style={{ background: 'var(--color-surface)', borderRadius: 8, padding: 24, width: 400, zIndex: 1 }}>
                <button
                    aria-label="close"
                    onClick={onClose}
                    style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                >×</button>
                <h2 style={{ fontWeight: 600, marginBottom: 16 }}>{strings.snapshot.shareCanvas}</h2>
                {step === 'idle' && (
                    <button
                        onClick={handleCreate}
                        className="w-full"
                        style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                        {strings.snapshot.createLink}
                    </button>
                )}
                {step === 'creating' && (
                    <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>{strings.snapshot.creating}</p>
                )}
                {step === 'ready' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{strings.snapshot.linkReady}</p>
                        <code style={{ fontSize: 12, padding: '6px 8px', background: 'var(--color-bg)', borderRadius: 4, wordBreak: 'break-all' }}>
                            {shareUrl}
                        </code>
                        <button
                            onClick={handleCopy}
                            style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                            {strings.snapshot.copyLink}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
