/**
 * Phase 4 — Mindmap Toggle Tests: Context menu, slash command, and AI prompt.
 *
 * Validates:
 * 1. Context menu shows "Mindmap View" / "Text View" toggle
 * 2. Slash command registry includes 'toggle-mindmap'
 * 3. AI generation uses mindmap-specific system prompt when contentMode='mindmap'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

// ── 1. Context menu toggle ────────────────────────────────────────────

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: (sel: (s: Record<string, unknown>) => unknown) => sel({
        currentWorkspaceId: 'ws-1',
        workspaces: [{ id: 'ws-1', name: 'W', type: 'workspace' }],
    }),
}));

// eslint-disable-next-line import-x/first
import { NodeContextMenu } from '../components/nodes/NodeContextMenu';

function makeMenuProps(overrides: Record<string, unknown> = {}) {
    return {
        nodeId: 'n-1',
        position: { x: 100, y: 100 },
        onClose: vi.fn(),
        onTagClick: vi.fn(),
        onPinToggle: vi.fn(),
        onCollapseToggle: vi.fn(),
        onPoolToggle: vi.fn(),
        onColorChange: vi.fn(),
        nodeColorKey: 'default' as const,
        isPinned: false,
        isCollapsed: false,
        isInPool: false,
        onContentModeToggle: vi.fn(),
        isMindmapMode: false,
        ...overrides,
    };
}

describe('NodeContextMenu — mindmap toggle', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows "Mindmap View" when isMindmapMode is false', () => {
        render(<NodeContextMenu {...makeMenuProps({ isMindmapMode: false })} />);
        expect(screen.getByText(strings.nodeUtils.mindmapView)).toBeInTheDocument();
    });

    it('shows "Text View" when isMindmapMode is true', () => {
        render(<NodeContextMenu {...makeMenuProps({ isMindmapMode: true })} />);
        expect(screen.getByText(strings.nodeUtils.textView)).toBeInTheDocument();
    });

    it('calls onContentModeToggle and onClose on click', () => {
        const onContentModeToggle = vi.fn();
        const onClose = vi.fn();
        render(
            <NodeContextMenu
                {...makeMenuProps({ onContentModeToggle, onClose, isMindmapMode: false })}
            />,
        );
        fireEvent.click(screen.getByText(strings.nodeUtils.mindmapView));
        expect(onContentModeToggle).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not render toggle when onContentModeToggle is undefined', () => {
        render(
            <NodeContextMenu
                {...makeMenuProps({ onContentModeToggle: undefined, isMindmapMode: false })}
            />,
        );
        expect(screen.queryByText(strings.nodeUtils.mindmapView)).not.toBeInTheDocument();
    });
});

// ── 2. Slash command registry ─────────────────────────────────────────

// eslint-disable-next-line import-x/first
import { slashCommands, filterCommands, getCommandById } from '../services/slashCommands';

describe('Slash commands — mindmap removed', () => {
    it('toggle-mindmap is NOT in the registry (mindmap is context-menu only)', () => {
        expect(slashCommands.find(c => (c.id as string) === 'toggle-mindmap')).toBeUndefined();
        expect(getCommandById('toggle-mindmap' as never)).toBeUndefined();
    });

    it('filterCommands("mindmap") does not return toggle-mindmap', () => {
        const results = filterCommands('mindmap');
        expect(results.some(c => (c.id as string) === 'toggle-mindmap')).toBe(false);
    });

    it('all remaining commands have unique prefixes', () => {
        const prefixes = slashCommands.map(c => c.prefix);
        expect(new Set(prefixes).size).toBe(prefixes.length);
    });
});

// ── 3. AI mindmap prompt ──────────────────────────────────────────────

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first
import { generateContent, generateContentWithContext } from '../../ai/services/geminiService';
// eslint-disable-next-line import-x/first
import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';

function mockGeminiSuccess(text: string) {
    vi.mocked(callGemini).mockResolvedValue({
        ok: true, status: 200,
        data: { candidates: [{ content: { parts: [{ text }] } }] },
    });
    vi.mocked(extractGeminiText).mockReturnValue(text);
}

describe('AI generation — mindmap system prompt', () => {
    beforeEach(() => vi.clearAllMocks());

    it('uses mindmap prompt when contentMode is "mindmap"', async () => {
        mockGeminiSuccess('# Topic\n- A');
        await generateContent('Create a plan', undefined, undefined, 'mindmap');
        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;
        expect(sysText).toContain('hierarchical markdown');
    });

    it('uses default prompt when contentMode is undefined', async () => {
        mockGeminiSuccess('Normal output');
        await generateContent('Create a plan');
        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;
        expect(sysText).toContain('concise content generator');
    });

    it('uses mindmap prompt for chain generation when contentMode is "mindmap"', async () => {
        mockGeminiSuccess('# Topic\n## Branch');
        await generateContentWithContext('Expand', ['Idea 1'], undefined, undefined, 'mindmap');
        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;
        expect(sysText).toContain('hierarchical markdown');
    });

    it('uses chain prompt for chain generation when contentMode is "text"', async () => {
        mockGeminiSuccess('Normal chain');
        await generateContentWithContext('Expand', ['Idea 1'], undefined, undefined, 'text');
        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;
        expect(sysText).toContain('idea evolution');
    });
});
