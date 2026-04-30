/**
 * TDD: useTemplatePicker hook tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplatePicker } from '../useTemplatePicker';
import type { WorkspaceTemplate } from '../../types/template';

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
        selector({ user: { id: 'user-123' } }),
}));

const mockGetCustomTemplates = vi.fn();
vi.mock('@/features/templates/services/customTemplateService', () => ({
    getCustomTemplates: (...args: unknown[]) => mockGetCustomTemplates(...args),
}));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const FAKE_TEMPLATE: WorkspaceTemplate = {
    id: 'tpl-1', name: 'My Template', description: '',
    category: 'custom', isCustom: true, nodes: [], edges: [],
};

describe('useTemplatePicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCustomTemplates.mockResolvedValue([]);
    });

    it('starts with picker closed', () => {
        const { result } = renderHook(() => useTemplatePicker());
        expect(result.current.isPickerOpen).toBe(false);
    });

    it('openPicker sets isPickerOpen to true', async () => {
        const { result } = renderHook(() => useTemplatePicker());
        await act(async () => { result.current.openPicker(); });
        expect(result.current.isPickerOpen).toBe(true);
    });

    it('closePicker sets isPickerOpen to false', async () => {
        const { result } = renderHook(() => useTemplatePicker());
        await act(async () => { result.current.openPicker(); });
        await act(async () => { result.current.closePicker(); });
        expect(result.current.isPickerOpen).toBe(false);
    });

    it('starts with empty customTemplates', () => {
        mockGetCustomTemplates.mockResolvedValue([]);
        const { result } = renderHook(() => useTemplatePicker());
        expect(result.current.customTemplates).toEqual([]);
    });

    it('fetches customTemplates when picker opens', async () => {
        mockGetCustomTemplates.mockResolvedValue([FAKE_TEMPLATE]);
        const { result } = renderHook(() => useTemplatePicker());
        await act(async () => { result.current.openPicker(); });
        expect(mockGetCustomTemplates).toHaveBeenCalledWith('user-123');
        expect(result.current.customTemplates).toEqual([FAKE_TEMPLATE]);
    });

    it('does NOT re-fetch if picker is closed without being opened', () => {
        mockGetCustomTemplates.mockResolvedValue([]);
        renderHook(() => useTemplatePicker());
        expect(mockGetCustomTemplates).not.toHaveBeenCalled();
    });

    it('isLoadingTemplates is false by default', () => {
        const { result } = renderHook(() => useTemplatePicker());
        expect(result.current.isLoadingTemplates).toBe(false);
    });

    it('logs error if getCustomTemplates throws', async () => {
        mockGetCustomTemplates.mockRejectedValue(new Error('Firestore error'));
        const { result } = renderHook(() => useTemplatePicker());
        await act(async () => { result.current.openPicker(); });
        const { logger } = await import('@/shared/services/logger');
        expect(logger.error).toHaveBeenCalled();
        expect(result.current.customTemplates).toEqual([]);
    });
});
