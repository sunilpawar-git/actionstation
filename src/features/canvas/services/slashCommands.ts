/**
 * Slash Commands Service
 * SSOT for available slash commands and filtering logic
 */
import type { SlashCommand } from '../types/slashCommand';

/**
 * Registry of all available slash commands
 * Add new commands here - they will automatically appear in the menu
 */
export const slashCommands: SlashCommand[] = [
    {
        id: 'ai-generate',
        labelKey: 'slashCommands.aiGenerate.label',
        descriptionKey: 'slashCommands.aiGenerate.description',
        icon: '✨',
        keywords: ['ai', 'generate', 'create', 'write'],
        prefix: 'ai',
    },
    {
        id: 'insert-image',
        labelKey: 'slashCommands.insertImage.label',
        descriptionKey: 'slashCommands.insertImage.description',
        icon: '🖼️',
        keywords: ['image', 'photo', 'picture', 'img', 'upload'],
        prefix: 'image',
    },
    {
        id: 'insert-document',
        labelKey: 'slashCommands.insertDocument.label',
        descriptionKey: 'slashCommands.insertDocument.description',
        icon: '📎',
        keywords: ['document', 'doc', 'pdf', 'file', 'attach', 'csv', 'txt'],
        prefix: 'doc',
    },
    {
        id: 'analyze-document',
        labelKey: 'slashCommands.analyzeDocument.label',
        descriptionKey: 'slashCommands.analyzeDocument.description',
        icon: '🔍',
        keywords: ['analyze', 'analyse', 'extract', 'insight', 'intelligence'],
        prefix: 'analyze',
    },
];

/**
 * Filter commands by search query
 * Matches against keyword prefixes (case-insensitive)
 * @param query - Search query (text after "/")
 * @returns Filtered list of matching commands
 */
export function filterCommands(query: string): SlashCommand[] {
    if (!query) {
        return slashCommands;
    }
    
    const q = query.toLowerCase();
    return slashCommands.filter(cmd =>
        cmd.keywords.some(keyword => keyword.startsWith(q))
    );
}

/**
 * Get a command by its ID
 * @param id - Command ID to find
 * @returns Command if found, undefined otherwise
 */
export function getCommandById(id: string): SlashCommand | undefined {
    return slashCommands.find(cmd => cmd.id === id);
}

/**
 * Get a command by its prefix (case-insensitive)
 * @param prefix - Command prefix to find (e.g. "ai")
 * @returns Command if found, undefined otherwise
 */
export function getCommandByPrefix(prefix: string): SlashCommand | undefined {
    if (!prefix) {
        return undefined;
    }
    const p = prefix.toLowerCase();
    return slashCommands.find(cmd => cmd.prefix === p);
}
