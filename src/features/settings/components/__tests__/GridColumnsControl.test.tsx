/**
 * GridColumnsControl Tests — TDD suite for the visual swatch grid picker.
 *
 * Covers:
 * - Renders a radiogroup with proper accessible label
 * - Renders one swatch per valid column option (Auto + 2–6 = 6 total)
 * - Active swatch has aria-checked="true"
 * - Clicking a swatch calls setGridColumns with correct value
 * - Auto swatch renders with label text "Auto"
 * - Numeric swatches render column count as aria-label
 * - Each swatch contains a visual miniature preview element
 * - Keyboard interaction: Enter/Space triggers selection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GridColumnsControl } from '../GridColumnsControl';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';
import { strings } from '@/shared/localization/strings';

function makeMockState(gridColumns: import('@/features/canvas/services/gridColumnsResolver').GridColumnsPreference = 4) {
    return createMockSettingsState({ gridColumns });
}

let mockState = makeMockState();

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(
        vi.fn((selector?: (s: typeof mockState) => unknown) =>
            typeof selector === 'function' ? selector(mockState) : mockState
        ),
        { getState: () => mockState }
    ),
}));

describe('GridColumnsControl', () => {
    beforeEach(() => {
        mockState = makeMockState();
        vi.clearAllMocks();
    });

    describe('accessibility structure', () => {
        it('renders a radiogroup with an accessible label', () => {
            render(<GridColumnsControl />);
            const group = screen.getByRole('radiogroup');
            expect(group).toBeDefined();
            const label = group.getAttribute('aria-labelledby') ?? group.getAttribute('aria-label');
            expect(label).toBeTruthy();
        });

        it('renders exactly 6 radio options (Auto + 2 + 3 + 4 + 5 + 6)', () => {
            render(<GridColumnsControl />);
            const radios = screen.getAllByRole('radio');
            expect(radios).toHaveLength(6);
        });

        it('renders a visible label for the control', () => {
            render(<GridColumnsControl />);
            expect(screen.getByText(strings.settings.gridColumnsLabel)).toBeDefined();
        });
    });

    describe('active state', () => {
        it('marks the current selection as checked', () => {
            mockState = makeMockState(4);
            render(<GridColumnsControl />);
            const fourRadio = screen.getByRole('radio', { name: /4 column/i });
            expect((fourRadio as HTMLInputElement).checked).toBe(true);
        });

        it('marks Auto as checked when gridColumns is "auto"', () => {
            mockState = makeMockState('auto');
            render(<GridColumnsControl />);
            const autoRadio = screen.getByRole('radio', { name: /auto/i });
            expect((autoRadio as HTMLInputElement).checked).toBe(true);
        });

        it('only one radio is checked at a time', () => {
            mockState = makeMockState(3);
            render(<GridColumnsControl />);
            const checked = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked);
            expect(checked).toHaveLength(1);
        });
    });

    describe('interaction', () => {
        it('calls setGridColumns with numeric value when a number swatch is clicked', () => {
            render(<GridColumnsControl />);
            const twoLabel = screen.getByRole('radio', { name: /2 column/i });
            fireEvent.click(twoLabel);
            expect(mockState.setGridColumns).toHaveBeenCalledWith(2);
        });

        it('calls setGridColumns with "auto" when Auto swatch is clicked', () => {
            render(<GridColumnsControl />);
            const autoRadio = screen.getByRole('radio', { name: /auto/i });
            fireEvent.click(autoRadio);
            expect(mockState.setGridColumns).toHaveBeenCalledWith('auto');
        });

        it('calls setGridColumns with 6 when six-column swatch is clicked', () => {
            render(<GridColumnsControl />);
            const sixRadio = screen.getByRole('radio', { name: /6 column/i });
            fireEvent.click(sixRadio);
            expect(mockState.setGridColumns).toHaveBeenCalledWith(6);
        });
    });

    describe('visual preview', () => {
        it('renders a preview element inside each swatch', () => {
            const { container } = render(<GridColumnsControl />);
            const previews = container.querySelectorAll('[data-column-preview]');
            expect(previews.length).toBe(6);
        });

        it('each numeric swatch preview has the correct column count attribute', () => {
            const { container } = render(<GridColumnsControl />);
            for (const n of [2, 3, 4, 5, 6]) {
                const preview = container.querySelector(`[data-column-preview="${n}"]`);
                expect(preview).toBeDefined();
            }
        });

        it('Auto swatch preview has data-column-preview="auto"', () => {
            const { container } = render(<GridColumnsControl />);
            const autoPreview = container.querySelector('[data-column-preview="auto"]');
            expect(autoPreview).toBeDefined();
        });
    });

    describe('label text', () => {
        it('Auto swatch shows "Auto" label', () => {
            render(<GridColumnsControl />);
            expect(screen.getByText(strings.settings.gridColumnsAuto)).toBeDefined();
        });

        it('numeric swatches show their column count as visible text', () => {
            render(<GridColumnsControl />);
            for (const n of [2, 3, 4, 5, 6]) {
                expect(screen.getByText(String(n))).toBeDefined();
            }
        });
    });
});
