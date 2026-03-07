import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClusterPreviewBar } from '../ClusterPreviewBar';
import type { ClusterGroup } from '../../types/cluster';

const GROUPS: ClusterGroup[] = [
    { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Theme A', colorIndex: 0 },
    { id: 'c2', nodeIds: ['n3', 'n4'], label: 'Theme B', colorIndex: 1 },
];

describe('ClusterPreviewBar', () => {
    it('renders theme count text in preview phase', () => {
        render(
            <ClusterPreviewBar phase="preview" previewGroups={GROUPS} onAccept={vi.fn()} onDismiss={vi.fn()} />,
        );
        expect(screen.getByText('Found 2 themes')).toBeInTheDocument();
    });

    it('accept button calls onAccept', () => {
        const onAccept = vi.fn();
        render(
            <ClusterPreviewBar phase="preview" previewGroups={GROUPS} onAccept={onAccept} onDismiss={vi.fn()} />,
        );
        fireEvent.click(screen.getByText('Accept'));
        expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('dismiss button calls onDismiss', () => {
        const onDismiss = vi.fn();
        render(
            <ClusterPreviewBar phase="preview" previewGroups={GROUPS} onAccept={vi.fn()} onDismiss={onDismiss} />,
        );
        fireEvent.click(screen.getByText('Dismiss'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('returns null when phase is idle', () => {
        const { container } = render(
            <ClusterPreviewBar phase="idle" previewGroups={null} onAccept={vi.fn()} onDismiss={vi.fn()} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('shows analyzing text during computing phase', () => {
        render(
            <ClusterPreviewBar phase="computing" previewGroups={null} onAccept={vi.fn()} onDismiss={vi.fn()} />,
        );
        expect(screen.getByText('Analyzing themes...')).toBeInTheDocument();
    });

    it('shows analyzing text during labeling phase', () => {
        render(
            <ClusterPreviewBar phase="labeling" previewGroups={null} onAccept={vi.fn()} onDismiss={vi.fn()} />,
        );
        expect(screen.getByText('Analyzing themes...')).toBeInTheDocument();
    });
});
