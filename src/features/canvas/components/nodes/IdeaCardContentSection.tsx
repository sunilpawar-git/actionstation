/**
 * IdeaCardContentSection — renders editor + surrounding UI for IdeaCard.
 *
 * CRITICAL: <TipTapEditor> is rendered at a STABLE position in the React tree
 * to prevent TipTap v3's EditorContent from unmounting during editing-state
 * transitions. Unmounting clears ReactNodeViewRenderer portals (attachment
 * cards, etc.) and the re-creation race silently drops them.
 */
import React, { lazy, Suspense } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { isContentModeMindmap, type ContentMode } from '../../types/contentMode';
import { GeneratingContent } from './IdeaCardContent';
import { TipTapEditor } from './TipTapEditor';
import { LinkPreviewList } from './LinkPreviewCard';
import { MindmapErrorBoundary } from './MindmapErrorBoundary';
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

// Lazy-load MindmapRenderer — keeps markmap-lib + markmap-view out of initial bundle
const LazyMindmapRenderer = lazy(() =>
    import('./MindmapRenderer').then(m => ({ default: m.MindmapRenderer }))
);

const EDITOR_HIDDEN_STYLE: React.CSSProperties = { display: 'none' };

export interface IdeaCardContentSectionProps {
    contentRef: React.Ref<HTMLDivElement>;
    selected: boolean | undefined;
    isEditing: boolean;
    onKeyDown: ((e: React.KeyboardEvent) => void) | undefined;
    isGenerating: boolean;
    hasContent: boolean;
    isAICard: boolean;
    heading: string | undefined;
    prompt: string;
    editor: Editor | null;
    handleDoubleClick: () => void;
    linkPreviews: IdeaNodeData['linkPreviews'];
    /** Rendering mode — 'text' (default) or 'mindmap'. SSOT: contentMode.ts */
    contentMode?: ContentMode;
    /** Raw markdown content for MindmapRenderer */
    output?: string;
    /** Called when user clicks the mindmap mode badge to switch back to text */
    onContentModeToggle?: () => void;
}

interface ContentViewState {
    showAIPrompt: boolean;
    showLinkPreviews: boolean;
    showPlaceholder: boolean;
    showMindmap: boolean;
    editorHidden: boolean;
    editorClassName: string;
}

function deriveViewState(
    isEditing: boolean, isGenerating: boolean, hasContent: boolean,
    isAICard: boolean, heading: string | undefined,
    contentMode: ContentMode | undefined,
): ContentViewState {
    const isMindmap = isContentModeMindmap(contentMode);
    // Only render the mindmap SVG when there is actual content to visualize.
    // Empty nodes show a helpful placeholder instead of a barren "Empty" root node.
    const showMindmap = isMindmap && hasContent && !isEditing && !isGenerating;
    return {
        showAIPrompt: !isEditing && !isGenerating && hasContent && isAICard && !heading?.trim(),
        showLinkPreviews: !isEditing && !isGenerating && hasContent,
        showPlaceholder: !hasContent && !isEditing && !isGenerating,
        showMindmap,
        editorHidden: isGenerating || showMindmap,
        editorClassName: (isEditing ? styles.inputWrapper : styles.outputContent) ?? '',
    };
}

interface AIPromptHeaderProps {
    prompt: string;
    onDoubleClick: () => void;
}

const AIPromptHeader = React.memo(({ prompt, onDoubleClick }: AIPromptHeaderProps) => (
    <>
        <div className={styles.promptText} onDoubleClick={onDoubleClick}
            role="button" tabIndex={0}>
            {prompt}
        </div>
        <div className={styles.divider} data-testid="ai-divider"
            aria-label={strings.ideaCard.aiDividerLabel} />
    </>
));
AIPromptHeader.displayName = 'AIPromptHeader';

function MindmapBlock({ output, onToggle }: { output: string | undefined; onToggle?: () => void }) {
    return (
        <>
            {onToggle && (
                <button className={styles.mindmapBadge} onClick={onToggle}
                    aria-label={strings.nodeUtils.textView}>
                    {strings.nodeUtils.textView}
                </button>
            )}
            <MindmapErrorBoundary onSwitchToText={onToggle}>
                <Suspense fallback={<div className={styles.mindmapLoading}>{strings.canvas.mindmap.loading}</div>}>
                    <LazyMindmapRenderer markdown={output ?? ''} />
                </Suspense>
            </MindmapErrorBoundary>
        </>
    );
}

export const IdeaCardContentSection = React.memo((props: IdeaCardContentSectionProps) => {
    const {
        contentRef, selected, isEditing, onKeyDown, isGenerating,
        hasContent, prompt, editor, handleDoubleClick, linkPreviews,
    } = props;

    const vs = deriveViewState(
        isEditing, isGenerating, hasContent, props.isAICard, props.heading,
        props.contentMode,
    );

    return (
        <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
            data-testid="content-area" data-node-section="content" ref={contentRef} tabIndex={selected || isEditing ? 0 : -1}
            onKeyDown={selected || isEditing ? onKeyDown : undefined}>

            {isGenerating && <GeneratingContent />}

            {vs.showAIPrompt && (
                <AIPromptHeader prompt={prompt} onDoubleClick={handleDoubleClick} />
            )}

            {vs.showMindmap && (
                <MindmapBlock output={props.output} onToggle={props.onContentModeToggle} />
            )}

            {/* Stable tree position — never unmounts during editing transitions */}
            <div
                className={vs.editorClassName}
                onDoubleClick={!isEditing ? handleDoubleClick : undefined}
                role={!isEditing ? 'button' : undefined}
                tabIndex={!isEditing && hasContent ? 0 : undefined}
                style={vs.editorHidden ? EDITOR_HIDDEN_STYLE : undefined}
            >
                <TipTapEditor
                    editor={editor}
                    data-testid={isEditing ? 'tiptap-editor' : 'view-editor'}
                />
            </div>

            {vs.showLinkPreviews && <LinkPreviewList previews={linkPreviews ?? {}} />}

            {vs.showPlaceholder && (
                <div className={styles.placeholder} onDoubleClick={handleDoubleClick}
                    role="button" tabIndex={0}>
                    {isContentModeMindmap(props.contentMode)
                        ? strings.canvas.mindmap.emptyHint
                        : strings.ideaCard.inputPlaceholder}
                </div>
            )}
        </div>
    );
});
IdeaCardContentSection.displayName = 'IdeaCardContentSection';
