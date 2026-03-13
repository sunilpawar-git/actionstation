/**
 * Slash Commands Service Tests
 * TDD: Tests written first, implementation follows
 */
import { describe, it, expect } from 'vitest';
import {
    slashCommands,
    filterCommands,
    getCommandById,
    getCommandByPrefix,
} from '../slashCommands';

describe('slashCommands', () => {
    describe('slashCommands array', () => {
        it('contains at least one command', () => {
            expect(slashCommands.length).toBeGreaterThan(0);
        });

        it('has ai-generate command', () => {
            const targetId = 'ai-generate';
            const aiCommand = slashCommands.find(cmd => cmd.id === targetId);
            expect(aiCommand).toBeDefined();
            expect(aiCommand?.id).toBe(targetId);
        });

        it('has insert-image command', () => {
            const targetId = 'insert-image';
            const imgCommand = slashCommands.find(cmd => cmd.id === targetId);
            expect(imgCommand).toBeDefined();
            expect(imgCommand?.icon).toBe('🖼️');
            expect(imgCommand?.prefix).toBe('image');
        });

        it('all commands have required fields', () => {
            slashCommands.forEach(cmd => {
                expect(cmd.id).toBeDefined();
                expect(cmd.labelKey).toBeDefined();
                expect(cmd.descriptionKey).toBeDefined();
                expect(cmd.icon).toBeDefined();
                expect(cmd.keywords).toBeDefined();
                expect(Array.isArray(cmd.keywords)).toBe(true);
                expect(cmd.keywords.length).toBeGreaterThan(0);
                expect(cmd.prefix).toBeDefined();
                expect(typeof cmd.prefix).toBe('string');
                expect(cmd.prefix.length).toBeGreaterThan(0);
            });
        });

        it('all commands have unique prefixes', () => {
            const prefixes = slashCommands.map(cmd => cmd.prefix);
            const uniquePrefixes = new Set(prefixes);
            expect(uniquePrefixes.size).toBe(prefixes.length);
        });

        it('ai-generate command has prefix "ai"', () => {
            const targetId = 'ai-generate';
            const aiCommand = slashCommands.find(cmd => cmd.id === targetId);
            expect(aiCommand?.prefix).toBe('ai');
        });
    });

    describe('filterCommands', () => {
        it('returns all commands for empty query', () => {
            const result = filterCommands('');
            expect(result).toEqual(slashCommands);
        });

        it('filters by keyword prefix "ai"', () => {
            const targetId = 'ai-generate';
            const result = filterCommands('ai');
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(cmd => cmd.id === targetId)).toBe(true);
        });

        it('filters by keyword prefix "gen"', () => {
            const targetId = 'ai-generate';
            const result = filterCommands('gen');
            expect(result.length).toBeGreaterThan(0);
            expect(result.some(cmd => cmd.id === targetId)).toBe(true);
        });

        it('filters by keyword prefix "image"', () => {
            const result = filterCommands('image');
            expect(result.some(cmd => cmd.id === 'insert-image')).toBe(true);
        });

        it('filters by keyword prefix "photo"', () => {
            const result = filterCommands('photo');
            expect(result.some(cmd => cmd.id === 'insert-image')).toBe(true);
        });

        it('returns empty array for no match', () => {
            const result = filterCommands('xyz123nonexistent');
            expect(result).toEqual([]);
        });

        it('is case insensitive', () => {
            const lowerResult = filterCommands('ai');
            const upperResult = filterCommands('AI');
            const mixedResult = filterCommands('Ai');
            
            expect(lowerResult).toEqual(upperResult);
            expect(upperResult).toEqual(mixedResult);
        });

        it('matches keyword start, not substring', () => {
            const aiResult = filterCommands('ai');
            expect(aiResult.length).toBeGreaterThan(0);
            
            // "i" matches "image" keyword (insert-image) but not "ai"
            const iResult = filterCommands('i');
            expect(iResult.some(cmd => cmd.id === 'insert-image')).toBe(true);
            expect(iResult.some(cmd => cmd.id === 'ai-generate')).toBe(false);
        });
    });

    describe('getCommandById', () => {
        it('returns command for valid id "ai-generate"', () => {
            const targetId = 'ai-generate';
            const result = getCommandById(targetId);
            expect(result).toBeDefined();
            expect(result?.id).toBe(targetId);
        });

        it('returns undefined for invalid id', () => {
            const result = getCommandById('nonexistent-command');
            expect(result).toBeUndefined();
        });

        it('returns undefined for empty id', () => {
            const result = getCommandById('');
            expect(result).toBeUndefined();
        });
    });

    describe('getCommandByPrefix', () => {
        it('returns command for valid prefix "ai"', () => {
            const result = getCommandByPrefix('ai');
            expect(result).toBeDefined();
            expect(result?.id).toBe('ai-generate');
            expect(result?.prefix).toBe('ai');
        });

        it('returns undefined for invalid prefix', () => {
            const result = getCommandByPrefix('nonexistent');
            expect(result).toBeUndefined();
        });

        it('returns undefined for empty prefix', () => {
            const result = getCommandByPrefix('');
            expect(result).toBeUndefined();
        });

        it('is case insensitive', () => {
            const lowerResult = getCommandByPrefix('ai');
            const upperResult = getCommandByPrefix('AI');
            const mixedResult = getCommandByPrefix('Ai');
            expect(lowerResult).toEqual(upperResult);
            expect(upperResult).toEqual(mixedResult);
        });
    });
});

// ── Mindmap slash command removal (TDD RED → GREEN) ───────────────────
describe('mindmap slash command removed', () => {
    it('toggle-mindmap is NOT in the registry', () => {
        // cast to string: SlashCommandId no longer includes this value — that's the point
        expect(slashCommands.some(c => (c.id as string) === 'toggle-mindmap')).toBe(false);
    });

    it('getCommandById returns undefined for toggle-mindmap', () => {
        expect(getCommandById('toggle-mindmap' as never)).toBeUndefined();
    });

    it('filterCommands("mindmap") returns no mindmap command', () => {
        const results = filterCommands('mindmap');
        expect(results.some(c => (c.id as string) === 'toggle-mindmap')).toBe(false);
    });

    it('filterCommands("convert") returns no mindmap command', () => {
        const results = filterCommands('convert');
        expect(results.every(c => (c.id as string) !== 'toggle-mindmap')).toBe(true);
    });
});
