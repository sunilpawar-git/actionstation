/**
 * TabLeaderContext — TDD tests (written BEFORE implementation).
 * Mocks createTabLeaderService to control role transitions in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { TabRole } from '@/shared/services/tabLeaderService';
import { TabLeaderProvider, useTabLeaderState, useTabLeaderRole } from '../TabLeaderContext';

// ─── Service mock ─────────────────────────────────────────────────────────────
let capturedRoleChange: ((role: TabRole) => void) | null = null;
const mockStart = vi.fn();
const mockStop = vi.fn();

vi.mock('@/shared/services/tabLeaderService', () => ({
    createTabLeaderService: vi.fn().mockImplementation(() => ({
        tabId: 'mock-tab-id',
        getRole: () => 'pending',
        start: mockStart,
        stop: mockStop,
        onRoleChange: vi.fn().mockImplementation((cb: (role: TabRole) => void) => {
            capturedRoleChange = cb;
            return () => { capturedRoleChange = null; };
        }),
    })),
}));

vi.mock('@/shared/stores/tabRoleStore', () => ({
    useTabRoleStore: { setState: vi.fn() },
}));

// ─── Consumer fixtures ────────────────────────────────────────────────────────
function RoleDisplay() {
    const { isLeader, role } = useTabLeaderState();
    return (
        <>
            <div data-testid="role">{role}</div>
            <div data-testid="leader">{String(isLeader)}</div>
        </>
    );
}

function RoleFlag() {
    const isLeader = useTabLeaderRole();
    return <div data-testid="flag">{String(isLeader)}</div>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('TabLeaderContext', () => {
    beforeEach(() => {
        capturedRoleChange = null;
        vi.clearAllMocks();
    });

    it('starts with role pending and isLeader false', () => {
        render(
            <TabLeaderProvider>
                <RoleDisplay />
            </TabLeaderProvider>,
        );
        // role starts as 'pending'; isLeader defaults false to prevent writes
        // during the brief election window before the first onRoleChange fires.
        expect(screen.getByTestId('role').textContent).toBe('pending');
        expect(screen.getByTestId('leader').textContent).toBe('false');
    });

    it('starts the service on mount and stops it on unmount', () => {
        const { unmount } = render(<TabLeaderProvider><div /></TabLeaderProvider>);
        expect(mockStart).toHaveBeenCalledTimes(1);
        unmount();
        expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('updates state when service calls onRoleChange with leader', () => {
        render(
            <TabLeaderProvider>
                <RoleDisplay />
            </TabLeaderProvider>,
        );
        act(() => capturedRoleChange?.('leader'));
        expect(screen.getByTestId('role').textContent).toBe('leader');
        expect(screen.getByTestId('leader').textContent).toBe('true');
    });

    it('updates state when service calls onRoleChange with follower', () => {
        render(
            <TabLeaderProvider>
                <RoleDisplay />
            </TabLeaderProvider>,
        );
        act(() => capturedRoleChange?.('follower'));
        expect(screen.getByTestId('role').textContent).toBe('follower');
        expect(screen.getByTestId('leader').textContent).toBe('false');
    });

    it('useTabLeaderRole returns true when leader', () => {
        render(
            <TabLeaderProvider>
                <RoleFlag />
            </TabLeaderProvider>,
        );
        act(() => capturedRoleChange?.('leader'));
        expect(screen.getByTestId('flag').textContent).toBe('true');
    });

    it('useTabLeaderRole returns false when follower', () => {
        render(
            <TabLeaderProvider>
                <RoleFlag />
            </TabLeaderProvider>,
        );
        act(() => capturedRoleChange?.('follower'));
        expect(screen.getByTestId('flag').textContent).toBe('false');
    });

    it('throws when useTabLeaderState is used outside provider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(() => render(<RoleDisplay />)).toThrow();
        spy.mockRestore();
    });
});
