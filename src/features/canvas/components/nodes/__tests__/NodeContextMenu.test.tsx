/**
 * NodeContextMenu Tests — Context menu for secondary node actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { NodeContextMenu } from '../NodeContextMenu';
import { pressEscape } from '@/shared/hooks/__tests__/helpers/escapeTestHelpers';

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: (sel: (s: Record<string, unknown>) => unknown) => sel({
        currentWorkspaceId: 'ws-1',
        workspaces: [
            { id: 'ws-1', name: 'Current', type: 'workspace' },
            { id: 'ws-2', name: 'Other', type: 'workspace' },
        ],
    }),
}));

describe('NodeContextMenu', () => {
    const defaultProps = {
        nodeId: 'node-1',
        position: { x: 100, y: 100 },
        onClose: vi.fn(),
        onTagClick: vi.fn(),
        onImageClick: vi.fn(),
        onAttachmentClick: vi.fn(),
        onFocusClick: vi.fn(),
        onDuplicateClick: vi.fn(),
        onShareClick: vi.fn().mockResolvedValue(undefined),
        isSharing: false,
        onPinToggle: vi.fn(),
        onCollapseToggle: vi.fn(),
        onPoolToggle: vi.fn(),
        onColorChange: vi.fn(),
        nodeColorKey: 'default' as const,
        isPinned: false,
        isCollapsed: false,
        isInPool: false,
    };

    beforeEach(() => { vi.clearAllMocks(); });

    it('renders all 4 group labels', () => {
        render(<NodeContextMenu {...defaultProps} />);
        expect(screen.getByText(strings.contextMenu.organize)).toBeInTheDocument();
        expect(screen.getByText(strings.contextMenu.appearance)).toBeInTheDocument();
        expect(screen.getByText(strings.contextMenu.insert)).toBeInTheDocument();
        expect(screen.getByText(strings.contextMenu.sharing)).toBeInTheDocument();
    });

    it('renders secondary action items', () => {
        render(<NodeContextMenu {...defaultProps} />);
        expect(screen.getByText(strings.nodeUtils.pin)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.duplicate)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.collapse)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.focus)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.tags)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.image)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.attachment)).toBeInTheDocument();
    });

    it('shows Unpin when isPinned is true', () => {
        render(<NodeContextMenu {...defaultProps} isPinned={true} />);
        expect(screen.getByText(strings.nodeUtils.unpin)).toBeInTheDocument();
        expect(screen.queryByText(strings.nodeUtils.pin)).not.toBeInTheDocument();
    });

    it('shows Expand when isCollapsed is true', () => {
        render(<NodeContextMenu {...defaultProps} isCollapsed={true} />);
        expect(screen.getByText(strings.nodeUtils.expand)).toBeInTheDocument();
        expect(screen.queryByText(strings.nodeUtils.collapse)).not.toBeInTheDocument();
    });

    it('click action calls handler and closes menu', () => {
        render(<NodeContextMenu {...defaultProps} />);
        fireEvent.click(screen.getByText(strings.nodeUtils.tags));
        expect(defaultProps.onTagClick).toHaveBeenCalledOnce();
        expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it('has role="menu"', () => {
        render(<NodeContextMenu {...defaultProps} />);
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('has role="menuitem" on action buttons', () => {
        render(<NodeContextMenu {...defaultProps} />);
        const items = screen.getAllByRole('menuitem');
        expect(items.length).toBeGreaterThanOrEqual(7);
    });

    it('renders in portal (document.body)', () => {
        const { baseElement } = render(<NodeContextMenu {...defaultProps} />);
        const menu = baseElement.querySelector('[role="menu"]');
        expect(menu?.parentElement).toBe(document.body);
    });

    it('groups separated by dividers', () => {
        render(<NodeContextMenu {...defaultProps} />);
        const separators = screen.getAllByRole('separator');
        expect(separators.length).toBe(3);
    });

    it('Color expandable panel toggles on click', () => {
        render(<NodeContextMenu {...defaultProps} />);
        const colorButton = screen.getByText(strings.nodeUtils.color);
        fireEvent.click(colorButton);
        expect(screen.getByText(strings.nodeUtils.nodeColorDefault)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.nodeColorRed)).toBeInTheDocument();
    });

    it('Share expandable panel shows workspaces', () => {
        render(<NodeContextMenu {...defaultProps} />);
        const shareButton = screen.getByText(strings.nodeUtils.share);
        fireEvent.click(shareButton);
        expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('all labels from string resources', () => {
        render(<NodeContextMenu {...defaultProps} />);
        expect(screen.getByText(strings.nodeUtils.pin)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.duplicate)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.tags)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.color)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.image)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.attachment)).toBeInTheDocument();
        expect(screen.getByText(strings.nodeUtils.share)).toBeInTheDocument();
    });

    it('shows "Remove from AI Memory" when isInPool is true', () => {
        render(<NodeContextMenu {...defaultProps} isInPool={true} />);
        expect(screen.getByText(strings.nodePool.removeFromPool)).toBeInTheDocument();
    });

    it('shows "Add to AI Memory" when isInPool is false', () => {
        render(<NodeContextMenu {...defaultProps} isInPool={false} />);
        expect(screen.getByText(strings.nodePool.addToPool)).toBeInTheDocument();
    });

    it('Escape calls onClose', () => {
        render(<NodeContextMenu {...defaultProps} />);
        pressEscape();
        expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it('pointerdown outside menu calls onClose', () => {
        render(<NodeContextMenu {...defaultProps} />);
        act(() => {
            document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        });
        expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it('pointerdown inside menu does not call onClose', () => {
        render(<NodeContextMenu {...defaultProps} />);
        const menu = screen.getByRole('menu');
        act(() => {
            menu.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        });
        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('clamps position to viewport edges', () => {
        Object.defineProperty(window, 'innerWidth', { value: 200, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 200, writable: true });
        render(<NodeContextMenu {...defaultProps} position={{ x: 500, y: 500 }} />);
        const menu = screen.getByRole('menu');
        const top = parseInt(menu.style.top, 10);
        const left = parseInt(menu.style.left, 10);
        expect(left).toBeLessThanOrEqual(200);
        expect(top).toBeLessThanOrEqual(200);
    });
});
