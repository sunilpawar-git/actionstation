/**
 * TDD: SaveAsTemplateDialog component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { CanvasNode } from '@/features/canvas/types/node';
import { SaveAsTemplateDialog } from '../SaveAsTemplateDialog';

vi.mock('@/shared/hooks/useEscapeLayer', () => ({ useEscapeLayer: vi.fn() }));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const TEST_NODE: CanvasNode = {
    id: 'n1', workspaceId: 'ws-1', type: 'idea',
    data: { heading: 'H', output: '', colorKey: 'default' },
    position: { x: 0, y: 0 },
    createdAt: new Date(), updatedAt: new Date(),
};

const defaultProps = {
    isOpen: true,
    userId: 'user-123',
    nodes: [TEST_NODE],
    edges: [] as never[],
    onSaved: vi.fn(),
    onClose: vi.fn(),
};

const mockSaveTemplate = vi.fn();
vi.mock('@/features/templates/services/customTemplateService', () => ({
    saveTemplate: (...args: unknown[]) => mockSaveTemplate(...args),
}));

describe('SaveAsTemplateDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSaveTemplate.mockResolvedValue({ id: 'new-tpl', name: 'Test', isCustom: true, category: 'custom', nodes: [], edges: [], description: '' });
    });

    it('does not render when isOpen is false', () => {
        render(<SaveAsTemplateDialog {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Save Workspace as Template')).toBeNull();
    });

    it('renders the dialog title when open', () => {
        render(<SaveAsTemplateDialog {...defaultProps} />);
        expect(screen.getByText('Save Workspace as Template')).toBeTruthy();
    });

    it('renders a text input for template name', () => {
        render(<SaveAsTemplateDialog {...defaultProps} />);
        expect(screen.getByRole('textbox')).toBeTruthy();
    });

    it('renders a Save Template button', () => {
        render(<SaveAsTemplateDialog {...defaultProps} />);
        expect(screen.getByText('Save Template')).toBeTruthy();
    });

    it('calls saveTemplate on form submit with trimmed name', async () => {
        render(<SaveAsTemplateDialog {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  My Template  ' } });
        fireEvent.click(screen.getByText('Save Template'));
        await waitFor(() => {
            expect(mockSaveTemplate).toHaveBeenCalledWith(
                'user-123', 'My Template', defaultProps.nodes, defaultProps.edges,
            );
        });
    });

    it('calls onSaved with the new template after successful save', async () => {
        const onSaved = vi.fn();
        render(<SaveAsTemplateDialog {...defaultProps} onSaved={onSaved} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My Template' } });
        fireEvent.click(screen.getByText('Save Template'));
        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    });

    it('shows error message if saveTemplate throws', async () => {
        mockSaveTemplate.mockRejectedValue(new Error('Name too long'));
        render(<SaveAsTemplateDialog {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        fireEvent.click(screen.getByText('Save Template'));
        await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        render(<SaveAsTemplateDialog {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
