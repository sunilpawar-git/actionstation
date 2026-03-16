/**
 * TagInput Component - Add/remove tags on nodes
 * BASB: Organize and categorize captured ideas
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTagStore } from '../stores/tagStore';
import { strings } from '@/shared/localization/strings';
import { tagNameSchema } from '@/shared/validation/schemas';

interface TagInputProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
    compact?: boolean;
}

/** Add/remove tags on a canvas node with inline autocomplete and on-the-fly tag creation. */
// eslint-disable-next-line max-lines-per-function -- tag input with autocomplete + CRUD
export function TagInput({ selectedTagIds, onChange, compact = false }: TagInputProps) {
    const [isInputVisible, setIsInputVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    
    const tags = useTagStore((state) => state.tags);

    const selectedTags = selectedTagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter(Boolean);

    const handleAddClick = useCallback(() => {
        setIsInputVisible(true);
    }, []);

    useEffect(() => {
        if (isInputVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isInputVisible]);

    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // NOTE: Escape here is intentionally local — it hides the tag input field
            // and is NOT migrated to useEscapeLayer. Correct UX for a controlled text
            // input; does not interact with canvas-level escape handling.
            // See PHASE-ESC-N-KEY-BULLETPROOF.md §2.6.
            if (e.key === 'Escape') {
                setIsInputVisible(false);
                setInputValue('');
            } else if (e.key === 'Enter') {
                const parsed = tagNameSchema.safeParse(inputValue);
                if (!parsed.success) return;
                const { getTagByName, addTag } = useTagStore.getState();
                const tag = getTagByName(parsed.data) ?? addTag(parsed.data);
                if (tag && !selectedTagIds.includes(tag.id)) {
                    onChange([...selectedTagIds, tag.id]);
                }
                setInputValue('');
                setIsInputVisible(false);
            }
        },
        [inputValue, selectedTagIds, onChange]
    );

    const handleRemoveTag = useCallback(
        (tagId: string) => {
            onChange(selectedTagIds.filter((id) => id !== tagId));
        },
        [selectedTagIds, onChange]
    );

    return (
        <div className="flex flex-wrap items-center" style={{ gap: compact ? 2 : 4, padding: '4px 0' }}>
            {selectedTags.map((tag) => (
                tag && (
                    <span
                        key={tag.id}
                        className="inline-flex items-center rounded-sm text-white"
                        style={{
                            fontSize: compact ? '10px' : 'var(--font-size-xs)',
                            backgroundColor: tag.color,
                            gap: 2,
                            padding: compact ? '1px 4px' : '2px 6px',
                        }}
                    >
                        <span className="max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">{tag.name}</span>
                        <button
                            className="flex items-center justify-center w-3.5 h-3.5 border-none bg-transparent text-inherit opacity-70 cursor-pointer text-xs leading-none hover:opacity-100"
                            style={{ padding: 0 }}
                            onClick={() => handleRemoveTag(tag.id)}
                            aria-label={`${strings.tags.removeTag} ${tag.name}`}
                        >
                            ×
                        </button>
                    </span>
                )
            ))}

            {isInputVisible ? (
                <input
                    ref={inputRef}
                    type="text"
                    className="w-20 border border-[var(--color-primary)] rounded-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                    style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px' }}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => {
                        setIsInputVisible(false);
                        setInputValue('');
                    }}
                    placeholder={strings.tags.placeholder}
                />
            ) : (
                <button
                    className="flex items-center justify-center w-5 h-5 border border-dashed border-[var(--color-border)] rounded-sm bg-transparent text-[var(--color-text-muted)] cursor-pointer text-xs transition-all duration-150 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    style={{ padding: 0 }}
                    onClick={handleAddClick}
                    aria-label={strings.tags.addTag}
                >
                    +
                </button>
            )}
        </div>
    );
}
