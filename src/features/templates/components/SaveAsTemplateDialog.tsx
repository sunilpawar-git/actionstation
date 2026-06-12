/**
 * SaveAsTemplateDialog — modal for naming and saving current workspace as a custom template.
 */
import React, { useState, useCallback } from 'react';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { saveTemplate } from '@/features/templates/services/customTemplateService';
import { logger } from '@/shared/services/logger';
import { templateStrings } from '../strings/templateStrings';
import type { WorkspaceTemplate } from '../types/template';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

interface Props {
    readonly isOpen: boolean;
    readonly userId: string;
    readonly nodes: CanvasNode[];
    readonly edges: CanvasEdge[];
    readonly onSaved: (template: WorkspaceTemplate) => void;
    readonly onClose: () => void;
}

export function SaveAsTemplateDialog({ isOpen, userId, nodes, edges, onSaved, onClose }: Props): React.ReactElement | null {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);

    const handleSave = useCallback(async () => {
        setError(null);
        setIsSaving(true);
        try {
            const template = await saveTemplate(userId, name.trim(), nodes, edges);
            onSaved(template);
        } catch (err: unknown) {
            logger.error('[SaveAsTemplateDialog] Failed to save template', err);
            setError(err instanceof Error ? err.message : templateStrings.errors.saveFailed);
        } finally {
            setIsSaving(false);
        }
    }, [userId, name, nodes, edges, onSaved]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="bg-[var(--color-surface)] rounded-xl w-full max-w-md overflow-clip"
                style={{ padding: '24px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]"
                    style={{ marginBottom: '16px' }}>
                    {templateStrings.saveAsDialogTitle}
                </h2>

                <label className="block text-sm text-[var(--color-text-secondary)]"
                    style={{ marginBottom: '6px' }}>
                    {templateStrings.templateNameLabel}
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)]"
                    style={{ padding: '8px 12px', marginBottom: '12px' }}
                    maxLength={50}
                    autoFocus
                />

                {error && (
                    <p role="alert" className="text-xs text-[var(--color-danger)]"
                        style={{ marginBottom: '12px' }}>
                        {error}
                    </p>
                )}

                <div className="flex justify-end" style={{ gap: '8px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        style={{ padding: '8px 16px' }}
                    >
                        {templateStrings.cancelBtn}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg disabled:opacity-50 transition-colors"
                        style={{ padding: '8px 16px' }}
                    >
                        {templateStrings.saveBtn}
                    </button>
                </div>
            </div>
        </div>
    );
}
