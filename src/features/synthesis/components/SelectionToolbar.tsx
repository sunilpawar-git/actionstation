/** SelectionToolbar — floating toolbar when 2+ nodes are selected */
import React, { useCallback, useState } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useSynthesis } from '../hooks/useSynthesis';
import { SynthesisModePopover } from './SynthesisModePopover';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';
import { exportStrings } from '@/features/export/strings/exportStrings';
import { useExportActions } from '@/features/export/hooks/useExportActions';
import { ExportDialog } from '@/features/export/components/ExportDialog';
import { captureError } from '@/shared/services/sentryService';

const MAX_SYNTHESIS_NODES = 50;

/** Floating toolbar shown when 2+ canvas nodes are selected; provides synthesis and export actions. */
export const SelectionToolbar = React.memo(function SelectionToolbar() {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const nodeCount = selectedNodeIds.size;
    const { synthesize, isSynthesizing, canSynthesize } = useSynthesis();
    const { handleQuickCopy, handleOpenExport, exportRoots, clearExportRoots } = useExportActions();
    const [isOpen, setIsOpen] = useState(false);
    const tooMany = nodeCount > MAX_SYNTHESIS_NODES;

    const handleOpenPopover = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleModeSelect = useCallback(
        (mode: SynthesisMode) => {
            setIsOpen(false);
            synthesize(mode).catch((e: unknown) => captureError(e));
        },
        [synthesize]
    );

    if (nodeCount < 2) return null;

    return (
        <>
            <div
                className="fixed left-1/2 -translate-x-1/2 flex items-center bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-dropdown)] z-[var(--z-dropdown)] animate-[toolbarIn_var(--transition-fast)_ease-out]"
                style={{ bottom: 24, gap: 8, padding: '8px 16px' }}
                role="toolbar"
                aria-label={synthesisStrings.labels.synthesize}
                data-testid="selection-toolbar"
            >
                <span className="font-medium text-[var(--color-text-secondary)] whitespace-nowrap" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {nodeCount} {synthesisStrings.labels.ideas}
                </span>
                <button
                    className="inline-flex items-center border-none rounded-md text-[var(--color-text-on-primary)] font-medium cursor-pointer transition-all duration-150 ease-in-out whitespace-nowrap hover:enabled:opacity-[var(--opacity-hover-subtle)] disabled:opacity-[var(--opacity-disabled)] disabled:cursor-not-allowed"
                    style={{ background: 'var(--node-status-synthesis)', gap: 4, padding: '4px 16px', fontSize: 'var(--font-size-sm)' }}
                    onClick={handleOpenPopover}
                    disabled={isSynthesizing || !canSynthesize}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    type="button"
                    title={tooMany ? synthesisStrings.labels.tooManyNodes : undefined}
                >
                    {isSynthesizing ? synthesisStrings.labels.generating : synthesisStrings.labels.synthesize}
                </button>
                <button className="inline-flex items-center rounded-md text-[var(--color-text-primary)] font-medium cursor-pointer transition-colors duration-150 ease-in-out whitespace-nowrap" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', gap: 4, padding: '4px 16px', fontSize: 'var(--font-size-sm)' }} onClick={handleQuickCopy} type="button">
                    {exportStrings.labels.copyBranch}
                </button>
                <button className="inline-flex items-center rounded-md text-[var(--color-text-primary)] font-medium cursor-pointer transition-colors duration-150 ease-in-out whitespace-nowrap" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', gap: 4, padding: '4px 16px', fontSize: 'var(--font-size-sm)' }} onClick={handleOpenExport} type="button">
                    {exportStrings.labels.exportSelection}
                </button>
                {isOpen && (
                    <SynthesisModePopover onSelect={handleModeSelect} onClose={handleClose} />
                )}
            </div>
            {exportRoots && <ExportDialog roots={exportRoots} onClose={clearExportRoots} />}
        </>
    );
});
