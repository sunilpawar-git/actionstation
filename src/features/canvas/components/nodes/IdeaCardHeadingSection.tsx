import React from 'react';
import type { NodeHeadingHandle } from './NodeHeading';
import { NodeHeading } from './NodeHeading';
import { NodeDivider } from './NodeDivider';
import { CalendarBadge } from '@/features/calendar/components/CalendarBadge';
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import styles from './IdeaCard.module.css';

export interface IdeaCardHeadingSectionProps {
    headingRef: React.Ref<NodeHeadingHandle>;
    heading: string;
    isEditing: boolean;
    onHeadingChange: (heading: string) => void;
    onEnterKey: () => void;
    onDoubleClick: () => void;
    onSlashCommand: (id: string) => void;
    onSubmitAI: (prompt: string) => void;
    calendarEvent?: CalendarEventMetadata;
    onCalendarRetry?: () => void;
    isCollapsed: boolean;
}

export const IdeaCardHeadingSection = React.memo(({
    headingRef, heading, isEditing, onHeadingChange, onEnterKey, onDoubleClick,
    onSlashCommand, onSubmitAI, calendarEvent, onCalendarRetry, isCollapsed,
}: IdeaCardHeadingSectionProps) => (
    <div className={styles.headingSection} data-node-section="heading">
        <NodeHeading ref={headingRef} heading={heading} isEditing={isEditing}
            onHeadingChange={onHeadingChange} onEnterKey={onEnterKey}
            onDoubleClick={onDoubleClick} onSlashCommand={onSlashCommand}
            onSubmitAI={onSubmitAI} />
        {calendarEvent && (
            <CalendarBadge metadata={calendarEvent}
                onRetry={calendarEvent.status !== 'synced' ? onCalendarRetry : undefined} />
        )}
        {!isCollapsed && <NodeDivider />}
    </div>
));
