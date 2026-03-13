/**
 * Slash Commands Integration Tests
 * Validates all registered slash commands
 */
import { describe, it, expect } from 'vitest';
import { slashCommands, filterCommands, getCommandById } from '@/features/canvas/services/slashCommands';

describe('Slash Commands Integration', () => {
    it('should have exactly 4 slash commands — mindmap is context-menu only', () => {
        expect(slashCommands).toHaveLength(4);
        expect(slashCommands.some(c => c.id === 'ai-generate')).toBe(true);
        expect(slashCommands.some(c => c.id === 'insert-image')).toBe(true);
        expect(slashCommands.some(c => c.id === 'insert-document')).toBe(true);
        expect(slashCommands.some(c => c.id === 'analyze-document')).toBe(true);
        expect(slashCommands.some(c => (c.id as string) === 'toggle-mindmap')).toBe(false);
        expect(slashCommands.some(c => (c.id as string) === 'convert-to-mindmap')).toBe(false);
    });

    it('should find ai-generate by id', () => {
        const cmd = getCommandById('ai-generate');
        expect(cmd).toBeDefined();
        expect(cmd?.icon).toBe('✨');
    });

    it('should find insert-image by id', () => {
        const cmd = getCommandById('insert-image');
        expect(cmd).toBeDefined();
        expect(cmd?.icon).toBe('🖼️');
    });

    it('should filter by "ai" to find only ai-generate', () => {
        const results = filterCommands('ai');
        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe('ai-generate');
    });

    it('should filter by "image" to find only insert-image', () => {
        const results = filterCommands('image');
        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe('insert-image');
    });

    it('should return all commands when no filter', () => {
        const results = filterCommands('');
        expect(results).toHaveLength(4);
    });

    it('should return empty for unmatched query', () => {
        const results = filterCommands('xyz');
        expect(results).toHaveLength(0);
    });
});
