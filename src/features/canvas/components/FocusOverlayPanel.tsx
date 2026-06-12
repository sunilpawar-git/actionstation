/**
 * FocusOverlayPanel — inner panel content for FocusOverlay.
 * Extracted to keep FocusOverlay within the 100-line component limit.
 */
import React, { Suspense } from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeHeading, type NodeHeadingHandle } from './nodes/NodeHeading';
import { TagInput } from '@/features/tags';
import { TipTapEditor } from './nodes/TipTapEditor';
import { LinkPreviewList } from './nodes/LinkPreviewCard';
import { MindmapErrorBoundary } from './nodes/MindmapErrorBoundary';
import colorStyles from './nodes/nodeColorStyles.module.css';
import type { Editor } from '@tiptap/react';
import type { LinkPreviewMetadata } from '../types/node';

const LazyMindmapRenderer = React.lazy(() =>
    import('./nodes/MindmapRenderer').then((m) => ({ default: m.MindmapRenderer })),
);

interface FocusOverlayPanelProps {
    focusTrapRef: React.RefObject<HTMLDivElement>;
    headingRef: React.RefObject<NodeHeadingHandle>;
    colorKey: string;
    heading: string;
    output: string | undefined;
    tagIds: string[];
    linkPreviews: Record<string, LinkPreviewMetadata> | undefined;
    contentMode?: string;
    isEditing: boolean;
    showMindmap: boolean;
    showMindmapEmpty: boolean;
    editor: Editor | null;
    onPanelClick: (e: React.MouseEvent) => void;
    onExit: () => void;
    onHeadingChange: (h: string) => void;
    onDoubleClick: () => void;
    onTagsChange: (ids: string[]) => void;
    onSwitchToText: () => void;
}

export function FocusOverlayPanel({ focusTrapRef, headingRef, colorKey, heading, output, tagIds, linkPreviews, isEditing, showMindmap, showMindmapEmpty, editor, onPanelClick, onExit, onHeadingChange, onDoubleClick, onTagsChange, onSwitchToText }: FocusOverlayPanelProps) {
    const panelStyle: React.CSSProperties = {
        width: showMindmap ? 'min(90%, var(--focus-panel-max-width, 1200px))' : 'min(70%, var(--focus-panel-max-width))',
        maxHeight: showMindmap ? 'none' : 'min(80vh, calc(100vh - var(--focus-panel-inset) * 2))',
        height: showMindmap ? 'min(92vh, calc(100vh - var(--space-lg) * 2))' : undefined,
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--focus-panel-radius)',
        boxShadow: 'var(--focus-panel-shadow)',
    };

    return (
        <div data-testid="focus-panel" data-color={colorKey} ref={focusTrapRef}
            className={`relative flex flex-col overflow-clip focus-overlay-panel ${colorStyles.colorContainer}`}
            style={panelStyle} onClick={onPanelClick}>
            <button data-testid="focus-close-button"
                className="absolute z-[1] flex items-center justify-center rounded-full cursor-pointer focus-overlay-close"
                style={{ top: 'var(--space-sm)', right: 'var(--space-sm)', width: 'var(--focus-close-size)', height: 'var(--focus-close-size)', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}
                onClick={onExit} aria-label={strings.nodeUtils.exitFocus}>
                {strings.common.closeSymbol}
            </button>
            <div className="flex-none" style={{ padding: 'var(--space-lg) var(--space-lg) 0', paddingRight: 'calc(var(--space-lg) + var(--focus-close-size) + var(--space-sm))' }}>
                <NodeHeading ref={headingRef} heading={heading} isEditing={isEditing}
                    onHeadingChange={onHeadingChange} onDoubleClick={onDoubleClick} />
            </div>
            <div className="h-px bg-[var(--color-border)]" style={{ margin: 'var(--space-sm) var(--space-lg)' }} />
            <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden focus-overlay-content ${showMindmap ? 'flex flex-col overflow-clip' : ''}`}
                style={{ padding: 'var(--space-lg)', fontSize: 'var(--font-size-base)', lineHeight: 'var(--line-height-normal)' }}
                data-testid="focus-content-area" onDoubleClick={!isEditing ? onDoubleClick : undefined}>
                {showMindmap && (
                    <div className="flex-1 min-h-0 w-full overflow-clip">
                        <MindmapErrorBoundary onSwitchToText={onSwitchToText}>
                            <Suspense fallback={<div className="flex flex-1 items-center justify-center min-h-[120px] italic focus-overlay-loading" style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>{strings.canvas.mindmap.loading}</div>}>
                                <LazyMindmapRenderer markdown={output ?? ''} disableZoom={false} />
                            </Suspense>
                        </MindmapErrorBoundary>
                    </div>
                )}
                {showMindmapEmpty && (
                    <div className="flex flex-1 flex-col items-center justify-center italic select-none" style={{ color: 'var(--color-text-muted)', gap: 'var(--space-sm)' }} data-testid="mindmap-empty-state">
                        <span className="opacity-50" style={{ fontSize: '2.5rem' }}>🧠</span>
                        <p>{strings.canvas.mindmap.emptyHint}</p>
                    </div>
                )}
                <div style={showMindmap ? { display: 'none' } : undefined}>
                    <TipTapEditor editor={editor} isEditable={isEditing} data-testid="focus-editor" />
                </div>
                <LinkPreviewList previews={linkPreviews ?? {}} />
            </div>
            {tagIds.length > 0 && (
                <div className="flex-none border-t border-[var(--color-border)]" style={{ padding: 'var(--space-sm) var(--space-lg) var(--space-md)' }}>
                    <TagInput selectedTagIds={tagIds} onChange={onTagsChange} compact />
                </div>
            )}
        </div>
    );
}
