/**
 * useWorkspaceLoader Hook Tests - TDD: Write tests FIRST
 * Tests for loading workspace data from Firestore on mount
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';

// Mock the workspace service
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

// Mock the workspace cache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
        update: vi.fn(),
        has: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn(),
        preload: vi.fn(),
    },
}));

// Mock network status store
const mockIsOnline = vi.fn().mockReturnValue(true);
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: Object.assign(
        vi.fn(() => ({ isOnline: mockIsOnline() })),
        { getState: () => ({ isOnline: mockIsOnline() }) }
    ),
}));

// Mock Knowledge Bank service + store (dynamic imports)
const mockLoadKBEntries = vi.fn().mockResolvedValue([]);
const mockSetKBEntries = vi.fn();
vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: (...args: unknown[]) => mockLoadKBEntries(...args),
}));
vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: Object.assign(vi.fn(), {
        getState: () => ({ setEntries: mockSetKBEntries }),
    }),
}));

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector?: (s: { user: typeof mockUser }) => unknown) => {
        const state = { user: mockUser };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

// Mock canvas store — uses setState for atomic updates
const mockCanvasSetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({ nodes: [], edges: [], editingNodeId: null, clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() }),
            setState: (...args: unknown[]) => mockCanvasSetState(...args),
        }
    ),
    EMPTY_SELECTED_IDS: Object.freeze(new Set<string>()),
}));

vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), {
        getState: () => ({ workspaces: [] }),
    }),
}));

describe('useWorkspaceLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
        mockCacheGet.mockReturnValue(null);
        mockIsOnline.mockReturnValue(true);
    });

    it('returns isLoading true initially', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));
        expect(result.current.isLoading).toBe(true);
        
        // Ensure async load completes to avoid act warnings
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('calls loadNodes and loadEdges on mount', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-1');
        });

        // Wait for final state update to complete
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('sets nodes and edges in store after load', async () => {
        const mockNodes = [
            { id: 'node-1', type: 'idea', data: { prompt: 'Test' } },
        ];
        const mockEdges = [
            { id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' },
        ];
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);

        renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(mockCanvasSetState).toHaveBeenCalledWith(
                expect.objectContaining({ nodes: mockNodes, edges: mockEdges })
            );
        });
    });

    it('returns isLoading false after load completes', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('handles load errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadNodes.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeTruthy();
        });

        consoleSpy.mockRestore();
    });

    it('does not load when user is null', async () => {
        // Temporarily override the mock to return null user
        vi.doMock('@/features/auth/stores/authStore', () => ({
            useAuthStore: (selector?: (s: { user: null }) => unknown) => {
                const state = { user: null };
                return typeof selector === 'function' ? selector(state) : state;
            },
        }));

        // Re-import to get the updated mock
        const { useWorkspaceLoader: freshHook } = await import('../hooks/useWorkspaceLoader');
        
        const { result } = renderHook(() => freshHook('ws-1'));

        // Use waitFor to handle async state updates
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('atomic canvas updates (prevents StoreUpdater cascade)', () => {
        it('uses useCanvasStore.setState for atomic updates', () => {
            const src = readFileSync(
                resolve(__dirname, '../hooks/useWorkspaceLoader.ts'), 'utf-8'
            );
            expect(src).not.toMatch(/useCanvasStore\(\s*\)/);
            expect(src).toMatch(/useCanvasStore\.setState\(/);
        });
    });

});
