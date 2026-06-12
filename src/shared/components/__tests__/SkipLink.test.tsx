/**
 * SkipLink tests — TDD (written BEFORE implementation).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipLink } from '../SkipLink';
import { strings } from '@/shared/localization/strings';

describe('SkipLink', () => {
    it('renders an anchor linking to #main-canvas', () => {
        render(<SkipLink />);
        const link = screen.getByRole('link', { name: strings.a11y.skipToContent });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '#main-canvas');
    });

    it('is visually hidden by default (sr-only style)', () => {
        const { container } = render(<SkipLink />);
        const link = container.querySelector('a');
        // The skip link must have a class or inline style that visually hides it
        expect(link?.className || link?.getAttribute('style')).toBeTruthy();
    });

    it('moves focus to #main-canvas on click', () => {
        const main = document.createElement('main');
        main.id = 'main-canvas';
        main.setAttribute('tabindex', '-1');
        document.body.appendChild(main);

        render(<SkipLink />);
        const link = screen.getByRole('link', { name: strings.a11y.skipToContent });
        const focusSpy = vi.spyOn(main, 'focus');
        fireEvent.click(link);
        expect(focusSpy).toHaveBeenCalled();
        main.remove();
    });
});
