/**
 * TDD: TemplatePicker component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePicker } from '../TemplatePicker';
import type { WorkspaceTemplate } from '../../types/template';

vi.mock('@/shared/hooks/useEscapeLayer', () => ({
    useEscapeLayer: vi.fn(),
}));

const BUILT_IN: WorkspaceTemplate = {
    id: 'basb', name: 'BASB CODE Framework', description: 'desc', category: 'basb',
    isCustom: false, nodes: [{ templateId: 'n1', heading: 'H', output: '', position: { x: 0, y: 0 }, colorKey: 'default' }], edges: [],
};
const CUSTOM: WorkspaceTemplate = {
    id: 'custom-1', name: 'My Custom', description: '', category: 'custom',
    isCustom: true, nodes: [], edges: [],
};

describe('TemplatePicker', () => {
    const defaultProps = {
        isOpen: true,
        builtInTemplates: [BUILT_IN],
        customTemplates: [],
        isLoadingCustom: false,
        onSelect: vi.fn(),
        onSelectBlank: vi.fn(),
        onClose: vi.fn(),
    };

    beforeEach(() => vi.clearAllMocks());

    it('does not render when isOpen is false', () => {
        render(<TemplatePicker {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Choose a Starting Point')).toBeNull();
    });

    it('renders title when open', () => {
        render(<TemplatePicker {...defaultProps} />);
        expect(screen.getByText('Choose a Starting Point')).toBeTruthy();
    });

    it('renders built-in template names', () => {
        render(<TemplatePicker {...defaultProps} />);
        expect(screen.getByText('BASB CODE Framework')).toBeTruthy();
    });

    it('renders Blank Canvas option', () => {
        render(<TemplatePicker {...defaultProps} />);
        expect(screen.getByText('Blank Canvas')).toBeTruthy();
    });

    it('calls onSelectBlank when Blank Canvas is clicked', () => {
        const onSelectBlank = vi.fn();
        render(<TemplatePicker {...defaultProps} onSelectBlank={onSelectBlank} />);
        fireEvent.click(screen.getByText('Blank Canvas'));
        expect(onSelectBlank).toHaveBeenCalledOnce();
    });

    it('calls onSelect with template when a template card is clicked', () => {
        const onSelect = vi.fn();
        render(<TemplatePicker {...defaultProps} onSelect={onSelect} />);
        fireEvent.click(screen.getByText('BASB CODE Framework'));
        expect(onSelect).toHaveBeenCalledWith(BUILT_IN);
    });

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn();
        render(<TemplatePicker {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByTestId('template-picker-backdrop'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('renders custom templates when provided', () => {
        render(<TemplatePicker {...defaultProps} customTemplates={[CUSTOM]} />);
        expect(screen.getByText('My Custom')).toBeTruthy();
    });

    it('shows My Templates section header when custom templates exist', () => {
        render(<TemplatePicker {...defaultProps} customTemplates={[CUSTOM]} />);
        expect(screen.getByText('My Templates')).toBeTruthy();
    });

    it('does not show My Templates section header when no custom templates', () => {
        render(<TemplatePicker {...defaultProps} customTemplates={[]} />);
        expect(screen.queryByText('My Templates')).toBeNull();
    });

    it('shows My Templates section with loading indicator when isLoadingCustom is true', () => {
        render(<TemplatePicker {...defaultProps} customTemplates={[]} isLoadingCustom />);
        expect(screen.getByText('My Templates')).toBeTruthy();
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not show loading indicator when isLoadingCustom is false', () => {
        render(<TemplatePicker {...defaultProps} customTemplates={[]} isLoadingCustom={false} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
