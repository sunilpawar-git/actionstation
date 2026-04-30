/**
 * TDD: TemplateCard component tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from '../TemplateCard';
import type { WorkspaceTemplate } from '../../types/template';

const TEMPLATE: WorkspaceTemplate = {
    id: 'tpl-1',
    name: 'Project Kickoff',
    description: 'Plan your project from day one',
    category: 'project',
    isCustom: false,
    nodes: [
        { templateId: 'n1', heading: 'Goal', output: '', position: { x: 0, y: 0 }, colorKey: 'default' },
        { templateId: 'n2', heading: 'Tasks', output: '', position: { x: 200, y: 0 }, colorKey: 'default' },
    ],
    edges: [],
};

describe('TemplateCard', () => {
    it('renders template name', () => {
        render(<TemplateCard template={TEMPLATE} onSelect={vi.fn()} />);
        expect(screen.getByText('Project Kickoff')).toBeTruthy();
    });

    it('renders node count badge', () => {
        render(<TemplateCard template={TEMPLATE} onSelect={vi.fn()} />);
        expect(screen.getByText('2 nodes')).toBeTruthy();
    });

    it('calls onSelect with template when clicked', () => {
        const onSelect = vi.fn();
        render(<TemplateCard template={TEMPLATE} onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledWith(TEMPLATE);
    });

    it('renders 1 node badge for single node', () => {
        const single = { ...TEMPLATE, nodes: [TEMPLATE.nodes[0]!] };
        render(<TemplateCard template={single} onSelect={vi.fn()} />);
        expect(screen.getByText('1 node')).toBeTruthy();
    });
});
