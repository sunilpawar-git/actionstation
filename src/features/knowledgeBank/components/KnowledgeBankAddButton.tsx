/**
 * KnowledgeBankAddButton — Toolbar button with dropdown menu
 * Positioned left of SearchBar in top toolbar
 */
import { useState, useCallback, useRef } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useFileProcessor } from '../hooks/useFileProcessor';
import { usePasteTextHandler } from '../hooks/usePasteTextHandler';
import { PasteTextModal } from './PasteTextModal';
import { KB_MAX_DOCUMENTS } from '../types/knowledgeBank';
import { kbParserRegistry } from '../parsers/parserRegistry';
import { strings } from '@/shared/localization/strings';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import {
    PaperclipIcon, AlertTriangleIcon, FileTextIcon,
    EditIcon, BookOpenIcon,
} from '@/shared/components/icons';
import {
    KB_ADD_CONTAINER,
    KB_ADD_BUTTON,
    KB_ADD_BUTTON_STYLE,
    KB_ADD_ICON_STYLE,
    KB_ADD_BADGE,
    KB_ADD_BADGE_STYLE,
    KB_DROPDOWN,
    KB_DROPDOWN_STYLE,
    KB_DROPDOWN_ITEM,
    KB_DROPDOWN_ITEM_STYLE,
    KB_DROPDOWN_ICON_STYLE,
    KB_DIVIDER,
    KB_DIVIDER_STYLE,
    KB_MAX_REACHED,
    KB_MAX_REACHED_STYLE,
    KB_DROPDOWN_LABEL,
    KB_DROPDOWN_LABEL_STYLE,
    KB_DROPDOWN_HINT_STYLE,
    KB_HIDDEN_INPUT,
} from './kbAddButtonStyles';

const ACCEPTED_EXTENSIONS = kbParserRegistry.getSupportedExtensions().join(',');

export function KnowledgeBankAddButton() {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const documentCount = useKnowledgeBankStore((s) =>
        s.entries.filter((e) => !e.parentEntryId).length
    );
    const { processFile, isProcessing } = useFileProcessor();
    const handlePasteSave = usePasteTextHandler(useCallback(() => setModalOpen(false), []));
    const handleModalClose = useCallback(() => setModalOpen(false), []);

    const isMaxReached = documentCount >= KB_MAX_DOCUMENTS;
    const kb = strings.knowledgeBank;

    const handleOutsideClick = useCallback(() => setDropdownOpen(false), []);
    useOutsideClick(containerRef, isDropdownOpen, handleOutsideClick);

    const handleUploadClick = useCallback(() => {
        setDropdownOpen(false);
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) await processFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        [processFile]
    );

    const handlePasteClick = useCallback(() => {
        setDropdownOpen(false);
        setModalOpen(true);
    }, []);

    const handleViewClick = useCallback(() => {
        setDropdownOpen(false);
        useKnowledgeBankStore.getState().setPanelOpen(true);
    }, []);

    return (
        <>
            <div className={KB_ADD_CONTAINER} ref={containerRef}>
                <button
                    className={KB_ADD_BUTTON}
                    style={KB_ADD_BUTTON_STYLE}
                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                    title={kb.addButton}
                    disabled={isProcessing}
                >
                    <span style={KB_ADD_ICON_STYLE}>
                        <PaperclipIcon size={16} />
                    </span>
                    {documentCount > 0 && (
                        <span className={KB_ADD_BADGE} style={KB_ADD_BADGE_STYLE}>
                            {documentCount}
                        </span>
                    )}
                </button>
                {isDropdownOpen && (
                    <DropdownMenu
                        isMaxReached={isMaxReached}
                        documentCount={documentCount}
                        onUpload={handleUploadClick}
                        onPaste={handlePasteClick}
                        onView={handleViewClick}
                    />
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className={KB_HIDDEN_INPUT}
            />
            <PasteTextModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handlePasteSave}
            />
        </>
    );
}

/** Sub-component: dropdown menu */
function DropdownMenu({ isMaxReached, documentCount, onUpload, onPaste, onView }: {
    isMaxReached: boolean; documentCount: number;
    onUpload: () => void; onPaste: () => void; onView: () => void;
}) {
    const kb = strings.knowledgeBank;
    return (
        <div className={KB_DROPDOWN} style={KB_DROPDOWN_STYLE}>
            {isMaxReached ? (
                <div className={KB_MAX_REACHED} style={KB_MAX_REACHED_STYLE}>
                    <span style={KB_DROPDOWN_ICON_STYLE}>
                        <AlertTriangleIcon size={14} />
                    </span>
                    <div>
                        <div className={KB_DROPDOWN_LABEL} style={KB_DROPDOWN_LABEL_STYLE}>
                            {kb.maxEntriesReached}
                        </div>
                        <div style={KB_DROPDOWN_HINT_STYLE}>{kb.maxEntriesDescription}</div>
                    </div>
                </div>
            ) : (
                <>
                    <button
                        className={KB_DROPDOWN_ITEM}
                        style={KB_DROPDOWN_ITEM_STYLE}
                        onClick={onUpload}
                    >
                        <span style={KB_DROPDOWN_ICON_STYLE}><FileTextIcon size={14} /></span>
                        {kb.uploadFile}
                    </button>
                    <button
                        className={KB_DROPDOWN_ITEM}
                        style={KB_DROPDOWN_ITEM_STYLE}
                        onClick={onPaste}
                    >
                        <span style={KB_DROPDOWN_ICON_STYLE}><EditIcon size={14} /></span>
                        {kb.pasteText}
                    </button>
                </>
            )}
            <div className={KB_DIVIDER} style={KB_DIVIDER_STYLE} />
            <button
                className={KB_DROPDOWN_ITEM}
                style={KB_DROPDOWN_ITEM_STYLE}
                onClick={onView}
            >
                <span style={KB_DROPDOWN_ICON_STYLE}><BookOpenIcon size={14} /></span>
                {kb.viewBank} ({documentCount})
            </button>
        </div>
    );
}
