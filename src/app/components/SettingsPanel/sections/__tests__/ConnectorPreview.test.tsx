/**
 * ConnectorPreview Tests — SVG line preview for connector styles
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectorPreview } from '../ConnectorPreview';
import type { ConnectorStyle } from '@/shared/stores/settingsStore';

const STYLES: ConnectorStyle[] = ['ghost', 'regular', 'light', 'bold', 'dashed', 'dotted'];

describe('ConnectorPreview', () => {
    it.each(STYLES)('renders an SVG for "%s" style', (style) => {
        const { container } = render(<ConnectorPreview style={style} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('sets aria-hidden on the SVG', () => {
        const { container } = render(<ConnectorPreview style="regular" />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not have role="img" (purely decorative)', () => {
        const { container } = render(<ConnectorPreview style="regular" />);
        const svg = container.querySelector('svg');
        expect(svg).not.toHaveAttribute('role');
    });

    it('renders no dasharray for regular style', () => {
        const { container } = render(<ConnectorPreview style="regular" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    // --- regular ---
    it('renders explicit stroke-width 2 for regular style', () => {
        const { container } = render(<ConnectorPreview style="regular" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-width', '2');
    });

    it('renders no dasharray for regular style', () => {
        const { container } = render(<ConnectorPreview style="regular" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    // --- light ---
    it('renders no dasharray for light style (faint solid line)', () => {
        const { container } = render(<ConnectorPreview style="light" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    it('renders reduced opacity for light style', () => {
        const { container } = render(<ConnectorPreview style="light" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-opacity', '0.5');
    });

    it('renders thin stroke-width 1 for light style', () => {
        const { container } = render(<ConnectorPreview style="light" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-width', '1');
    });

    // --- bold ---
    it('renders stroke-width 4 for bold style', () => {
        const { container } = render(<ConnectorPreview style="bold" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-width', '4');
    });

    // --- dashed ---
    it('renders dasharray 6 6 for dashed style', () => {
        const { container } = render(<ConnectorPreview style="dashed" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-dasharray', '6 6');
    });

    it('renders no linecap for dashed style', () => {
        const { container } = render(<ConnectorPreview style="dashed" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-linecap');
    });

    // --- dotted ---
    it('renders dasharray 2 6 for dotted style', () => {
        const { container } = render(<ConnectorPreview style="dotted" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-dasharray', '2 6');
    });

    it('renders round linecap for dotted style', () => {
        const { container } = render(<ConnectorPreview style="dotted" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-linecap', 'round');
    });

    // --- ghost ---
    it('renders stroke-opacity 0.22 for ghost style', () => {
        const { container } = render(<ConnectorPreview style="ghost" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-opacity', '0.22');
    });

    it('renders stroke-width 0.75 for ghost style', () => {
        const { container } = render(<ConnectorPreview style="ghost" />);
        const line = container.querySelector('line');
        expect(line).toHaveAttribute('stroke-width', '0.75');
    });

    it('renders no dasharray for ghost style', () => {
        const { container } = render(<ConnectorPreview style="ghost" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-dasharray');
    });

    it('renders no linecap for ghost style', () => {
        const { container } = render(<ConnectorPreview style="ghost" />);
        const line = container.querySelector('line');
        expect(line).not.toHaveAttribute('stroke-linecap');
    });
});
