import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSemanticZoom } from '../useSemanticZoom';

let mockZoom = 1;

vi.mock('@xyflow/react', () => ({
    useStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ transform: [0, 0, mockZoom] }),
}));

beforeEach(() => {
    mockZoom = 1;
    const el = document.createElement('div');
    el.className = 'react-flow';
    document.body.innerHTML = '';
    document.body.appendChild(el);
});

describe('useSemanticZoom', () => {
    it('zoom >= 0.5 sets data-zoom-level="full"', () => {
        mockZoom = 0.8;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('full');
    });

    it('zoom 0.3 sets data-zoom-level="heading"', () => {
        mockZoom = 0.3;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('heading');
    });

    it('zoom 0.2 sets data-zoom-level="dot"', () => {
        mockZoom = 0.2;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('dot');
    });

    it('zoom exactly 0.5 is "full" (boundary)', () => {
        mockZoom = 0.5;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('full');
    });

    it('zoom exactly 0.25 is "heading" (boundary)', () => {
        mockZoom = 0.25;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('heading');
    });

    it('zoom 0.1 is "dot"', () => {
        mockZoom = 0.1;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('dot');
    });

    it('zoom 2.0 is "full"', () => {
        mockZoom = 2.0;
        renderHook(() => useSemanticZoom());
        expect(document.querySelector('.react-flow')?.getAttribute('data-zoom-level')).toBe('full');
    });
});
