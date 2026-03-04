/**
 * TagInput Component - Add/remove tags on nodes
 * BASB: Organize and categorize captured ideas
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTagStore } from '../stores/tagStore';
import { strings } from '@/shared/localization/strings';
import { tagNameSchema } from '@/shared/validation/schemas';
import styles from './TagInput.module.css';

interface TagInputProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
    compact?: boolean;
}

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
        <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
            {selectedTags.map((tag) => (
                tag && (
                    <span
                        key={tag.id}
                        className={styles.tag}
                        style={{ backgroundColor: tag.color }}
                    >
                        <span className={styles.tagName}>{tag.name}</span>
                        <button
                            className={styles.removeButton}
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
                    className={styles.input}
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
                    className={styles.addButton}
                    onClick={handleAddClick}
                    aria-label={strings.tags.addTag}
                >
                    +
                </button>
            )}
        </div>
    );
}
