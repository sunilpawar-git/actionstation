/**
 * Phase 5 — Mindmap Slash Command & Strings Integration Tests
 *
 * Split from phase5MindmapIntegration.test.tsx to stay within 300-line limit.
 * Validates slash command registry and string resource completeness.
 */
import { describe, it, expect } from 'vitest';
import { filterCommands, getCommandById } from '../services/slashCommands';
import { strings } from '@/shared/localization/strings';

// ── 5. Slash command — mindmap removed ───────────────────────────────

describe('Slash command — mindmap intentionally absent', () => {
    it('toggle-mindmap is NOT in slash command registry (context-menu only)', () => {
        expect(getCommandById('toggle-mindmap' as never)).toBeUndefined();
    });

    it('filterCommands("mindmap") returns no mindmap command', () => {
        const results = filterCommands('mindmap');
        expect(results.some((c: { id: string }) => c.id === 'toggle-mindmap')).toBe(false);
    });
});

// ── 6. String resources completeness ──────────────────────────────────

describe('Mindmap string resources', () => {
    it('has all required mindmap-related strings', () => {
        expect(strings.nodeUtils.mindmapView).toBe('Mindmap View');
        expect(strings.nodeUtils.textView).toBe('Text View');
        expect(strings.canvas.mindmap.ariaLabel).toBeDefined();
        expect(strings.canvas.mindmap.emptyFallback).toBeDefined();
        expect(strings.canvas.mindmap.errorFallback).toBeDefined();
    });

    it('does not have a slash command string for toggleMindmap (removed)', () => {
        // Mindmap is accessed via right-click context menu only — no slash command
        expect('toggleMindmap' in strings.slashCommands).toBe(false);
    });
});
