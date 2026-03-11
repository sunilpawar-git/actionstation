/**
 * NodeHeading - Editable heading with slash command support
 * Uses useHeadingEditor for TipTap + SlashCommand + SubmitKeymap integration
 * Tab key handled at React level (guarded by suggestionActiveRef)
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React, { useCallback, useImperativeHandle } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import { useHeadingEditor } from '../../hooks/useHeadingEditor';
import { TipTapEditor } from './TipTapEditor';
import styles from './NodeHeading.module.css';

export interface NodeHeadingHandle { focus: () => void; getHeading: () => string }

interface NodeHeadingProps {
    heading: string;
    isEditing: boolean;
    onHeadingChange: (heading: string) => void;
    onEnterKey?: () => void;
    onDoubleClick?: () => void;
    onBlur?: (heading: string) => void;
    onSlashCommand?: (id: string) => void;
    onSubmitAI?: (prompt: string) => void;
}

export const NodeHeading = React.memo(React.forwardRef<NodeHeadingHandle, NodeHeadingProps>(
    ({ heading, isEditing, onHeadingChange, onEnterKey, onDoubleClick, onBlur,
        onSlashCommand, onSubmitAI }, ref) => {
        const inputMode = useCanvasStore((s) => s.inputMode);
        const placeholder = inputMode === 'ai'
            ? strings.ideaCard.headingAiPlaceholder : strings.ideaCard.headingPlaceholder;

        const { editor, suggestionActiveRef, getHeading } = useHeadingEditor({
            heading, placeholder, isEditing, onHeadingChange,
            onBlur, onEnterKey, onSlashCommand, onSubmitAI,
        });

        useImperativeHandle(ref, () => ({
            focus: () => { editor?.commands.focus(); },
            getHeading,
        }), [editor, getHeading]);

        const handleTabKey = useCallback((e: React.KeyboardEvent) => {
            if (e.key === 'Tab' && !e.shiftKey && !suggestionActiveRef.current) {
                e.preventDefault();
                onEnterKey?.();
            }
        }, [onEnterKey, suggestionActiveRef]);

        return (
            <div className={styles.headingContainer} data-testid="node-heading"
                onKeyDown={isEditing ? handleTabKey : undefined}
                onDoubleClick={!isEditing ? onDoubleClick : undefined}>
                <TipTapEditor editor={editor} className={styles.headingEditor}
                    data-testid={isEditing ? 'heading-editor' : 'node-heading-view'} />
            </div>
        );
    },
));
