/**
 * IdeaCardContentSection — renders editor + surrounding UI for IdeaCard.
 *
 * CRITICAL: <TipTapEditor> is rendered at a STABLE position in the React tree
 * to prevent TipTap v3's EditorContent from unmounting during editing-state
 * transitions. Unmounting clears ReactNodeViewRenderer portals (attachment
 * cards, etc.) and the re-creation race silently drops them.
 */
import React from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { GeneratingContent } from './IdeaCardContent';
import { TipTapEditor } from './TipTapEditor';
import { LinkPreviewList } from './LinkPreviewCard';
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

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
}

interface ContentViewState {
    showAIPrompt: boolean;
    showLinkPreviews: boolean;
    showPlaceholder: boolean;
    editorHidden: boolean;
    editorClassName: string;
}

function deriveViewState(
    isEditing: boolean, isGenerating: boolean, hasContent: boolean,
    isAICard: boolean, heading: string | undefined,
): ContentViewState {
    return {
        showAIPrompt: !isEditing && !isGenerating && hasContent && isAICard && !heading?.trim(),
        showLinkPreviews: !isEditing && !isGenerating && hasContent,
        showPlaceholder: !hasContent && !isEditing && !isGenerating,
        editorHidden: isGenerating,
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

export const IdeaCardContentSection = React.memo((props: IdeaCardContentSectionProps) => {
    const {
        contentRef, selected, isEditing, onKeyDown, isGenerating,
        hasContent, prompt, editor, handleDoubleClick, linkPreviews,
    } = props;

    const vs = deriveViewState(isEditing, isGenerating, hasContent, props.isAICard, props.heading);

    return (
        <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
            data-testid="content-area" data-node-section="content" ref={contentRef} tabIndex={selected || isEditing ? 0 : -1}
            onKeyDown={selected || isEditing ? onKeyDown : undefined}>

            {isGenerating && <GeneratingContent />}

            {vs.showAIPrompt && (
                <AIPromptHeader prompt={prompt} onDoubleClick={handleDoubleClick} />
            )}

            {/* Stable tree position — never unmounts during editing transitions */}
            <div
                className={vs.editorClassName}
                onDoubleClick={!isEditing ? handleDoubleClick : undefined}
                role={!isEditing ? 'button' : undefined}
                tabIndex={!isEditing && hasContent ? 0 : undefined}
                style={vs.editorHidden ? { display: 'none' } : undefined}
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
                    {strings.ideaCard.inputPlaceholder}
                </div>
            )}
        </div>
    );
});
