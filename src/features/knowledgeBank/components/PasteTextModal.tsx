/**
 * PasteTextModal — Modal for adding text entries to Knowledge Bank
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';
import { kbEntrySchema } from '@/shared/validation/schemas';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import styles from './PasteTextModal.module.css';

interface PasteTextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, content: string) => void;
}

export const PasteTextModal = React.memo(function PasteTextModal({ isOpen, onClose, onSave }: PasteTextModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const wasOpenRef = useRef(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, isOpen, onClose);
    useFocusTrap(modalRef, isOpen);

    useEffect(() => {
        // Reset fields only on open -> closed transition to avoid update loops.
        if (!isOpen && wasOpenRef.current) {
            setTitle('');
            setContent('');
        }
        wasOpenRef.current = isOpen;
    }, [isOpen]);

    const handleSave = useCallback(() => {
        const result = kbEntrySchema.safeParse({ title, content });
        if (!result.success) return;
        onSave(result.data.title, result.data.content);
        setTitle('');
        setContent('');
    }, [title, content, onSave]);

    if (!isOpen) return null;

    const kb = strings.knowledgeBank;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="paste-text-title">
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal} ref={modalRef}>
                <div className={styles.header}>
                    <h4 id="paste-text-title" className={styles.title}>{kb.saveEntry}</h4>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={strings.settings.close}
                    >
                        {strings.common.closeSymbol}
                    </button>
                </div>
                <div className={styles.body}>
                    <input
                        className={styles.titleInput}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={kb.titlePlaceholder}
                        maxLength={100}
                    />
                    <textarea
                        className={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={kb.contentPlaceholder}
                        maxLength={KB_MAX_CONTENT_SIZE}
                    />
                    <div className={styles.charCount}>
                        {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        {strings.common.cancel}
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={!title.trim() || !content.trim()}
                    >
                        {kb.saveEntry}
                    </button>
                </div>
            </div>
        </div>
    );
});
