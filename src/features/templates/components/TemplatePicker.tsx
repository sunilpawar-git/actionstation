/**
 * TemplatePicker — modal that lets the user choose a template for a new workspace.
 * Renders built-in templates, custom templates, and a Blank Canvas option.
 */
import React from 'react';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { BUILT_IN_TEMPLATES } from '../services/templateDefinitions';
import { TemplateCard } from './TemplateCard';
import { templateStrings } from '../strings/templateStrings';
import type { WorkspaceTemplate } from '../types/template';

interface Props {
    readonly isOpen: boolean;
    readonly builtInTemplates?: readonly WorkspaceTemplate[];
    readonly customTemplates: WorkspaceTemplate[];
    readonly isLoadingCustom: boolean;
    readonly onSelect: (template: WorkspaceTemplate) => void;
    readonly onSelectBlank: () => void;
    readonly onClose: () => void;
}

const CustomTemplatesLoader = React.memo(function CustomTemplatesLoader({ label }: { readonly label: string }): React.ReactElement {
    return (
        <div role="status" className="flex items-center text-[var(--color-text-secondary)]"
            aria-label={label} style={{ gap: '8px', padding: '8px 0' }}>
            <span className="animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"
                style={{ width: '14px', height: '14px' }} />
            <span className="text-xs">{label}</span>
        </div>
    );
});

export const TemplatePicker = React.memo(function TemplatePicker({
    isOpen,
    builtInTemplates = BUILT_IN_TEMPLATES,
    customTemplates,
    isLoadingCustom,
    onSelect,
    onSelectBlank,
    onClose,
}: Props): React.ReactElement | null {
    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);

    if (!isOpen) return null;

    const showCustomSection = isLoadingCustom || customTemplates.length > 0;

    return (
        <div
            data-testid="template-picker-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={templateStrings.pickerTitle}
                className="relative bg-[var(--color-surface)] rounded-xl overflow-clip w-full max-w-2xl"
                style={{ padding: '28px', maxHeight: '80vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]"
                    style={{ marginBottom: '20px' }}>
                    {templateStrings.pickerTitle}
                </h2>

                {showCustomSection && (
                    <section style={{ marginBottom: '20px' }}>
                        <h3 className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)] tracking-wide"
                            style={{ marginBottom: '10px' }}>
                            {templateStrings.customSection}
                        </h3>
                        {isLoadingCustom ? (
                            <CustomTemplatesLoader label={templateStrings.loadingCustom} />
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: '10px' }}>
                                {customTemplates.map((t) => (
                                    <TemplateCard key={t.id} template={t} onSelect={onSelect} />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <section>
                    <h3 className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)] tracking-wide"
                        style={{ marginBottom: '10px' }}>
                        {templateStrings.builtInSection}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onSelectBlank}
                            className="flex flex-col items-start w-full rounded-lg border border-dashed border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                            style={{ padding: '12px 14px', gap: '6px' }}
                        >
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {templateStrings.blankCanvas}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)]">
                                {templateStrings.blankCanvasDesc}
                            </span>
                        </button>
                        {builtInTemplates.map((t) => (
                            <TemplateCard key={t.id} template={t} onSelect={onSelect} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
});
