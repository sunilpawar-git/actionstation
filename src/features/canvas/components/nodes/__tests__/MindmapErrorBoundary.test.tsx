/**
 * Phase C — MindmapErrorBoundary tests.
 *
 * Validates that a rendering crash inside MindmapRenderer shows
 * a graceful error fallback instead of crashing the parent node.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { MindmapErrorBoundary } from '../MindmapErrorBoundary';

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

function ThrowOnRender(): React.JSX.Element {
    throw new Error('markmap boom');
}

describe('MindmapErrorBoundary', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders children when no error occurs', () => {
        render(
            <MindmapErrorBoundary>
                <div data-testid="child">ok</div>
            </MindmapErrorBoundary>,
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders errorFallback string on child crash', () => {
        // Suppress React error boundary console noise
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MindmapErrorBoundary>
                <ThrowOnRender />
            </MindmapErrorBoundary>,
        );
        expect(screen.getByText(strings.canvas.mindmap.errorFallback)).toBeInTheDocument();
        spy.mockRestore();
    });

    it('reports error to Sentry', async () => {
        const { captureError } = await import('@/shared/services/sentryService');
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <MindmapErrorBoundary>
                <ThrowOnRender />
            </MindmapErrorBoundary>,
        );
        expect(captureError).toHaveBeenCalledWith(expect.any(Error));
        spy.mockRestore();
    });
});
