/**
 * SkipLink — visually hidden anchor that skips keyboard focus to the main canvas.
 * Placed as the first focusable element in the DOM so keyboard users can bypass
 * the navigation chrome and jump straight to the canvas.
 *
 * Visible only when focused (handled via the `.skip-link` CSS class in global.css).
 * Moves focus to `#main-canvas` on click.
 */
import { strings } from '@/shared/localization/strings';

function handleClick(e: React.MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    const target = document.getElementById('main-canvas');
    target?.focus();
}

export function SkipLink() {
    return (
        <a
            href="#main-canvas"
            onClick={handleClick}
            className="skip-link"
        >
            {strings.a11y.skipToContent}
        </a>
    );
}
