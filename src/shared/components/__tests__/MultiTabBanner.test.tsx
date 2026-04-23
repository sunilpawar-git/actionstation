/**
 * MultiTabBanner tests — TDD (written BEFORE implementation).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { TabRole } from '@/shared/services/tabLeaderService';
import { MultiTabBanner } from '../MultiTabBanner';
import { strings } from '@/shared/localization/strings';

// Mock context to control isLeader/role
let mockIsLeader = true;
let mockRole: TabRole = 'leader';

vi.mock('@/shared/contexts/TabLeaderContext', () => ({
    useTabLeaderState: vi.fn(() => ({ isLeader: mockIsLeader, role: mockRole })),
    useTabLeaderRole: vi.fn(() => mockIsLeader),
    TabLeaderProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('MultiTabBanner', () => {
    it('renders nothing when this tab is the leader', () => {
        mockIsLeader = true;
        mockRole = 'leader';
        const { container } = render(<MultiTabBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing while role is pending', () => {
        mockIsLeader = true;
        mockRole = 'pending';
        const { container } = render(<MultiTabBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders banner with warning text when follower', () => {
        mockIsLeader = false;
        mockRole = 'follower';
        render(<MultiTabBanner />);
        expect(screen.getByText(strings.multiTab.anotherTabOpen)).toBeInTheDocument();
    });

    it('renders take-over button when follower', () => {
        mockIsLeader = false;
        mockRole = 'follower';
        render(<MultiTabBanner />);
        expect(screen.getByRole('button', { name: strings.multiTab.takeOver })).toBeInTheDocument();
    });

    it('has correct aria-label on the banner region', () => {
        mockIsLeader = false;
        mockRole = 'follower';
        render(<MultiTabBanner />);
        expect(screen.getByRole('region', { name: strings.multiTab.ariaLabel })).toBeInTheDocument();
    });

    it('reloads the page when take-over button is clicked', () => {
        mockIsLeader = false;
        mockRole = 'follower';
        const reloadMock = vi.fn();
        vi.stubGlobal('location', { reload: reloadMock });

        render(<MultiTabBanner />);
        fireEvent.click(screen.getByRole('button', { name: strings.multiTab.takeOver }));
        expect(reloadMock).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
    });
});
