/**
 * IdeaCard Style Tests - Verify CSS classes are applied correctly
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { TierLimitsProvider } from '@/features/subscription/contexts/TierLimitsContext';
import type { NodeProps } from '@xyflow/react';

// Mock TipTap hooks and extensions
vi.mock('../../../hooks/useIdeaCardEditor', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardEditorMock()
);
vi.mock('../../../hooks/useNodeInput', async () =>
    (await import('./helpers/tipTapTestMock')).useNodeInputMock()
);
vi.mock('../../../hooks/useLinkPreviewFetch', () => ({
    useLinkPreviewFetch: vi.fn(),
}));
vi.mock('../../../hooks/useTipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).hookMock()
);
vi.mock('../TipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).componentMock()
);
vi.mock('../../../extensions/slashCommandSuggestion', async () =>
    (await import('./helpers/tipTapTestMock')).extensionMock()
);

vi.mock('../../../hooks/useIdeaCardActions', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock()
);
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);
vi.mock('../NodeHeading', () => ({
    NodeHeading: ({ heading, onDoubleClick }: { heading: string; onDoubleClick?: () => void }) => (
        <div data-testid="node-heading" onDoubleClick={onDoubleClick}>{heading}</div>
    ),
}));
vi.mock('../NodeDivider', () => ({
    NodeDivider: () => <div data-testid="node-divider" />,
}));

// Mock CSS modules - returns class name as-is for testing
vi.mock('../IdeaCard.module.css', () => ({
    default: {
        cardWrapper: 'cardWrapper',
        ideaCard: 'ideaCard',
        contentArea: 'contentArea',
        placeholder: 'placeholder',
        inputArea: 'inputArea',
        promptText: 'promptText',
        outputContent: 'outputContent',
        actionBar: 'actionBar',
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        handle: 'handle',
        handleTop: 'handleTop',
        handleBottom: 'handleBottom',
        icon: 'icon',
        generating: 'generating',
        spinner: 'spinner',
        divider: 'divider',
        headingSection: 'headingSection',
    },
}));

vi.mock('../nodeColorStyles.module.css', () => ({
    default: { colorContainer: 'colorContainer' },
}));
vi.mock('@/features/subscription/hooks/useNodeCreationGuard', () => ({ useNodeCreationGuard: () => ({ guardNodeCreation: () => true }) }));

// Helper to wrap component with ReactFlow provider
const renderWithProvider = (props: Partial<NodeProps>) => {
    const defaultProps: NodeProps = {
        id: 'test-node',
        data: { prompt: '', output: undefined },
        selected: false,
        type: 'idea',
        zIndex: 0,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        draggable: true,
        dragHandle: undefined,
        sourcePosition: undefined,
        targetPosition: undefined,
        deletable: true,
        selectable: true,
        parentId: undefined,
        width: 280,
        height: 120,
    };

    return render(
        React.createElement(
            TierLimitsProvider,
            null,
            React.createElement(
                ReactFlowProvider,
                null,
                React.createElement(IdeaCard, { ...defaultProps, ...props })
            )
        )
    );
};

describe('IdeaCard styles', () => {
    beforeEach(async () => {
        const { resetMockState, initNodeInputStore, initStateStore } = await import('./helpers/tipTapTestMock');
        resetMockState();
        initNodeInputStore(useCanvasStore);
        initStateStore(useCanvasStore);
        useCanvasStore.setState({
            nodes: [], edges: [], selectedNodeIds: new Set(),
            editingNodeId: null, draftContent: null, inputMode: 'note',
        });
    });

    it('should render TipTap editor in edit mode', () => {
        // Empty node starts in edit mode
        renderWithProvider({
            id: 'test-node',
            data: { prompt: '', output: undefined },
        });

        const editor = screen.getByTestId('tiptap-editor');
        expect(editor).toBeInTheDocument();
    });

    it('should apply outputContent class when displaying content', () => {
        renderWithProvider({
            id: 'output-node',
            data: { prompt: '', output: 'Some note content' },
        });

        // Content area should contain our text
        const contentArea = screen.getByTestId('content-area');
        expect(contentArea).toBeInTheDocument();
        expect(contentArea).toHaveClass('contentArea');
    });

    it('should apply ideaCard class to card container', () => {
        renderWithProvider({
            id: 'test-node',
            data: { prompt: '', output: 'Test' },
        });

        // Card wrapper exists
        const contentArea = screen.getByTestId('content-area');
        // Navigate up to the ideaCard container (content-area -> ideaCard)
        const wrapper = contentArea.closest('.ideaCard');
        expect(wrapper).not.toBeNull();
        expect(wrapper).toHaveClass('ideaCard');
    });

    it('should apply promptText class for AI card prompts', () => {
        renderWithProvider({
            id: 'ai-node',
            data: { prompt: 'AI prompt', output: 'AI response that differs' },
        });

        // AI card shows prompt with promptText class
        const promptElement = screen.getByRole('button', { name: /AI prompt/i });
        expect(promptElement).toHaveClass('promptText');
    });

    describe('node color — contentArea inherits color (no --output-bg masking)', () => {
        it('contentArea uses transparent background so parent color shows through', () => {
            const css = readFileSync(
                resolve(__dirname, '../IdeaCard.module.css'), 'utf-8'
            );
            const contentMatch = /^\.contentArea\s*\{[^}]*background:\s*([^;]+);/m.exec(css);
            expect(contentMatch).toBeTruthy();
            expect(contentMatch![1]!.trim()).toBe('transparent');
        });

        it('data-color="default" scopes --output-bg to contentArea', () => {
            const css = readFileSync(
                resolve(__dirname, '../IdeaCard.module.css'), 'utf-8'
            );
            expect(css).toMatch(/\.ideaCard\[data-color="default"\]\s+\.contentArea/);
        });

        it('shared nodeColorStyles contains data-color selectors for all status colors', () => {
            const sharedCss = readFileSync(
                resolve(__dirname, '../nodeColorStyles.module.css'), 'utf-8'
            );
            expect(sharedCss).toMatch(/\[data-color="danger"\]/);
            expect(sharedCss).toMatch(/\[data-color="warning"\]/);
            expect(sharedCss).toMatch(/\[data-color="success"\]/);
        });
    });
});
