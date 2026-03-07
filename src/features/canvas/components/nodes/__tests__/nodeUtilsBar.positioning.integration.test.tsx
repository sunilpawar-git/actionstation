/**
 * NodeUtilsBar Integration Tests — Flat 5-action bar.
 * Validates bar structure, CSS conventions, and a11y.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBar } from '../NodeUtilsBar';

vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        barWrapper: 'barWrapper',
        deckBase: 'deckBase',
        deckOne: 'deckOne',
        peekIndicator: 'peekIndicator',
    },
}));

vi.mock('../TooltipButton.module.css', () => ({
    default: {
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        icon: 'icon',
    },
}));

describe('NodeUtilsBar CSS conventions', () => {
    const cssPath = resolve(__dirname, '../NodeUtilsBar.module.css');
    const variablesPath = resolve(__dirname, '../../../../../styles/variables.css');
    let moduleCss: string;
    let variablesCss: string;

    beforeEach(() => {
        moduleCss = readFileSync(cssPath, 'utf8');
        variablesCss = readFileSync(variablesPath, 'utf8');
    });

    it('variables.css defines --node-utils-bar-top-offset', () => {
        expect(variablesCss).toContain('--node-utils-bar-top-offset');
    });

    it('CSS defines .deckOne class', () => {
        expect(moduleCss).toContain('.deckOne');
    });

    it('CSS does not define .deckTwo or .deckTwoOpen classes', () => {
        expect(moduleCss).not.toContain('.deckTwo');
        expect(moduleCss).not.toContain('.deckTwoOpen');
    });

    it('CSS does not use translateY(-50%)', () => {
        expect(moduleCss).not.toContain('translateY(-50%)');
    });

    it('.barWrapper uses left: 100% to position outside card', () => {
        expect(moduleCss).toContain('left: 100%');
        const barWrapperBlock = moduleCss.split('.barWrapper')[1]?.split('}')[0] ?? '';
        expect(barWrapperBlock).not.toMatch(/right:\s*0/);
    });

    it('transition durations use CSS variables, not hardcoded ms values', () => {
        expect(variablesCss).toContain('--node-utils-transition-duration');
        expect(variablesCss).toContain('--node-utils-spring-duration');
        expect(moduleCss).toContain('var(--node-utils-transition-duration)');
        expect(moduleCss).toContain('var(--node-utils-spring-duration)');
    });

    it('peekPulse animation is disabled under prefers-reduced-motion', () => {
        expect(moduleCss).toContain('prefers-reduced-motion');
        const reducedBlock = /prefers-reduced-motion[\s\S]*?\}[\s]*\}/.exec(moduleCss)?.[0] ?? '';
        expect(reducedBlock).toContain('animation');
        expect(reducedBlock).toContain('none');
    });
});

describe('NodeUtilsBar strings compliance', () => {
    it('strings.nodeUtils defines moreIcon', () => {
        expect(strings.nodeUtils).toHaveProperty('moreIcon');
        expect(strings.nodeUtils.moreIcon).toBe('•••');
    });
});

describe('NodeUtilsBar flat bar', () => {
    const defaultProps = {
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onCopyClick: vi.fn(),
        onDelete: vi.fn(),
        onMoreClick: vi.fn(),
        hasContent: true,
    };

    beforeEach(() => { vi.clearAllMocks(); });

    it('renders exactly one toolbar', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbars = screen.getAllByRole('toolbar');
        expect(toolbars.length).toBe(1);
    });

    it('toolbar has correct aria-label', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        const toolbar = screen.getByRole('toolbar');
        expect(toolbar).toHaveAttribute('aria-label', strings.canvas.nodeActionsLabel);
    });

    it('renders peek indicator', () => {
        const { container } = render(
            <div><NodeUtilsBar {...defaultProps} /></div>,
        );
        const peek = container.querySelector('.peekIndicator');
        expect(peek).toBeInTheDocument();
    });

    it('renders primary action buttons', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
    });

    it('calls onDelete when delete clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        fireEvent.click(screen.getByLabelText(strings.nodeUtils.delete));
        expect(defaultProps.onDelete).toHaveBeenCalledOnce();
    });

    it('calls onConnectClick when connect clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        fireEvent.click(screen.getByLabelText(strings.nodeUtils.connect));
        expect(defaultProps.onConnectClick).toHaveBeenCalledOnce();
    });

    it('calls onMoreClick when more clicked', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        fireEvent.click(screen.getByLabelText(strings.nodeUtils.more));
        expect(defaultProps.onMoreClick).toHaveBeenCalledOnce();
    });

    it('copy disabled when hasContent is false', () => {
        render(<NodeUtilsBar {...defaultProps} hasContent={false} />);
        expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeDisabled();
    });

    it('disables all buttons when disabled prop is true', () => {
        render(<NodeUtilsBar {...defaultProps} disabled={true} />);
        expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeDisabled();
        expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeDisabled();
        expect(screen.getByLabelText(strings.nodeUtils.more)).toBeDisabled();
    });

    it('more button has aria-haspopup', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        expect(screen.getByLabelText(strings.nodeUtils.more)).toHaveAttribute('aria-haspopup', 'true');
    });

    it('all labels come from string resources', () => {
        render(<NodeUtilsBar {...defaultProps} />);
        expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
    });
});
