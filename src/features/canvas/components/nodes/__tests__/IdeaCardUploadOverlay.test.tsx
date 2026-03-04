/**
 * IdeaCardUploadOverlay Tests — presentational overlay for document upload state
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdeaCardUploadOverlay } from '../IdeaCardUploadOverlay';
import { strings } from '@/shared/localization/strings';

describe('IdeaCardUploadOverlay', () => {
    it('renders overlay with spinner when visible is true', () => {
        render(<IdeaCardUploadOverlay visible />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render when visible is false', () => {
        const { container } = render(<IdeaCardUploadOverlay visible={false} />);

        expect(container.firstChild).toBeNull();
    });

    it('has aria-live polite for accessibility', () => {
        render(<IdeaCardUploadOverlay visible />);

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('displays the uploading string resource', () => {
        render(<IdeaCardUploadOverlay visible />);

        expect(screen.getByText(strings.canvas.docUploading)).toBeInTheDocument();
    });
});
