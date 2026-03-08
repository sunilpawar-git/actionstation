/**
 * TagFilterChips — Multi-select tag filter rendered as accessible chip buttons.
 * No direct store access — receives all data via props.
 */
import { searchStrings } from '../strings/searchStrings';
import styles from './SearchFilterBar.module.css';

interface TagFilterChipsProps {
    readonly availableTags: string[];
    readonly selectedTags: string[];
    readonly onToggle: (tag: string) => void;
}

export function TagFilterChips({ availableTags, selectedTags, onToggle }: TagFilterChipsProps) {
    if (availableTags.length === 0) return null;

    return (
        <div className={styles.tagChips} role="group" aria-label={searchStrings.filterTags}>
            {availableTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        role="checkbox"
                        aria-checked={selected}
                        className={`${styles.tagChip} ${selected ? styles.tagChipSelected : ''}`}
                        onClick={() => onToggle(tag)}
                        type="button"
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}
