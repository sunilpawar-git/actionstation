import React from 'react';
import { TagInput } from '@/features/tags';
import styles from './IdeaCard.module.css';

export interface IdeaCardTagsSectionProps {
    tagIds: string[];
    onChange: (ids: string[]) => void;
    visible: boolean;
}

export const IdeaCardTagsSection = React.memo(({ tagIds, onChange, visible }: IdeaCardTagsSectionProps) => {
    if (!visible) return null;
    return (
        <div className={styles.tagsSection} data-node-section="tags">
            <TagInput selectedTagIds={tagIds} onChange={onChange} compact />
        </div>
    );
});
