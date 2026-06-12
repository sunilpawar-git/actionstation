/**
 * TemplateCard — displays a single workspace template option in the picker.
 */
import React from 'react';
import type { WorkspaceTemplate } from '../types/template';
import { templateStrings } from '../strings/templateStrings';

interface Props {
    readonly template: WorkspaceTemplate;
    readonly onSelect: (template: WorkspaceTemplate) => void;
}

export const TemplateCard = React.memo(function TemplateCard({ template, onSelect }: Props): React.ReactElement {
    const nodeCount = template.nodes.length;
    const badgeLabel = nodeCount === 1
        ? templateStrings.nodesBadgeSingular
        : templateStrings.nodesBadge.replace('{count}', String(nodeCount));

    return (
        <button
            type="button"
            onClick={() => onSelect(template)}
            className="flex flex-col items-start w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors text-left"
            style={{ padding: '12px 14px', gap: '6px' }}
        >
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {template.name}
            </span>
            {template.description && (
                <span className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {template.description}
                </span>
            )}
            <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-secondary)] rounded"
                style={{ padding: '2px 6px' }}>
                {badgeLabel}
            </span>
        </button>
    );
});
