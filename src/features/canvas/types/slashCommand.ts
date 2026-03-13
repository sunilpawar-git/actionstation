/**
 * Slash Command Type Definitions
 * Model layer for slash command feature (MVVM)
 */

/**
 * Represents a single slash command that can be triggered by typing "/"
 */
export interface SlashCommand {
    /** Unique identifier for the command */
    id: SlashCommandId;
    /** Key into strings object for localized label */
    labelKey: string;
    /** Key into strings object for localized description */
    descriptionKey: string;
    /** Emoji or icon to display */
    icon: string;
    /** Keywords for filtering/search (lowercase) */
    keywords: string[];
    /** Prefix used for inline command mode (e.g. "ai" for "/ai:") */
    prefix: string;
}

/**
 * Valid slash command IDs
 * Extend this union type when adding new commands
 */
export type SlashCommandId = 'ai-generate' | 'insert-image' | 'insert-document' | 'analyze-document';

/**
 * Input mode for IdeaCard based on slash command selection
 */
export type InputMode = 'note' | 'ai';
