import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SynthesisFooter } from '../SynthesisFooter';
import { synthesisStrings } from '../../strings/synthesisStrings';

const mockClearSelection = vi.fn();
const mockSelectNode = vi.fn();

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ nodes: [], edges: [], selectedNodeIds: new Set() }),
        {
            getState: () => ({
                clearSelection: mockClearSelection,
                selectNode: mockSelectNode,
            }),
        }
    ),
}));

describe('SynthesisFooter', () => {
    const defaultProps = {
        sourceCount: 5,
        sourceNodeIds: ['A', 'B', 'C', 'D', 'E'],
        onReSynthesize: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders action-oriented source link with count', () => {
        render(<SynthesisFooter {...defaultProps} />);
        const linkText = `${synthesisStrings.labels.viewSources(5)}`;
        expect(screen.getByText(linkText)).toBeDefined();
    });

    test('source link text does NOT repeat the card title', () => {
        render(<SynthesisFooter {...defaultProps} />);
        expect(screen.queryByText(/Synthesis of/i)).toBeNull();
    });

    test('click source link selects source nodes on canvas', () => {
        render(<SynthesisFooter {...defaultProps} />);
        fireEvent.click(screen.getByText(synthesisStrings.labels.viewSources(5)));
        expect(mockClearSelection).toHaveBeenCalledOnce();
        expect(mockSelectNode).toHaveBeenCalledTimes(5);
        expect(mockSelectNode).toHaveBeenCalledWith('A');
        expect(mockSelectNode).toHaveBeenCalledWith('E');
    });

    test('click re-synthesize button calls onReSynthesize', () => {
        render(<SynthesisFooter {...defaultProps} />);
        fireEvent.click(screen.getByLabelText(synthesisStrings.labels.reSynthesize));
        expect(defaultProps.onReSynthesize).toHaveBeenCalledOnce();
    });

    test('re-synth button has correct aria-label', () => {
        render(<SynthesisFooter {...defaultProps} />);
        expect(screen.getByLabelText(synthesisStrings.labels.reSynthesize)).toBeDefined();
    });
});
