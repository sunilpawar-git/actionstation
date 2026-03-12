import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { OnboardingWalkthrough } from '../OnboardingWalkthrough';
import { WELCOME_STORAGE_KEY, STORAGE_KEY } from '../../types/onboarding';
import { seedDemoNodes } from '../../utils/seedDemoNodes';
import { useOnboardingSignalStore } from '../../stores/onboardingSignalStore';
import {
    trackOnboardingWelcomeShown,
    trackOnboardingWelcomeDismissed,
    trackOnboardingStepViewed,
    trackOnboardingCompleted,
    trackOnboardingSkipped,
} from '@/shared/services/analyticsService';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: (selector: (s: { currentWorkspaceId: string }) => unknown) =>
        selector({ currentWorkspaceId: 'ws-test' }),
}));

const mockSelectNode    = vi.fn();
const mockClearSelection = vi.fn();

vi.mock('@/features/canvas/stores/canvasStore', () => {
    const useCanvasStore = (selector: (s: object) => unknown) =>
        selector({ selectedNodeIds: new Set(), nodes: [], edges: [] });
    useCanvasStore.getState = () => ({
        selectNode:    mockSelectNode,
        clearSelection: mockClearSelection,
    });
    return { useCanvasStore };
});

vi.mock('../../utils/seedDemoNodes', () => ({ seedDemoNodes: vi.fn() }));

// CoachMark requires a real DOM target and ResizeObserver — stub it with a minimal
// implementation that still exercises the onNext/onSkip props.
vi.mock('../CoachMark', () => ({
    CoachMark: ({ onSkip, onNext }: { onSkip: () => void; onNext: () => void }) => (
        <div data-testid="coach-mark">
            <button data-testid="mock-skip-btn" onClick={onSkip}>Skip</button>
            <button data-testid="mock-next-btn" onClick={onNext}>Next</button>
        </div>
    ),
}));

vi.mock('@/shared/services/analyticsService', () => ({
    trackOnboardingWelcomeShown:     vi.fn(),
    trackOnboardingWelcomeDismissed: vi.fn(),
    trackOnboardingStepViewed:       vi.fn(),
    trackOnboardingCompleted:        vi.fn(),
    trackOnboardingSkipped:          vi.fn(),
}));

vi.mock('@/shared/hooks/useEscapeLayer', () => ({ useEscapeLayer: vi.fn() }));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OnboardingWalkthrough', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        useOnboardingSignalStore.setState({ replayRequestCount: 0 });
    });

    it('renders WelcomeScreen on first visit (welcome_shown absent)', async () => {
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(screen.queryByTestId('welcome-screen')).toBeTruthy();
        });
    });

    it('does NOT render WelcomeScreen when welcome_shown="true"', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(screen.queryByTestId('welcome-screen')).toBeNull();
        });
    });

    it('coach marks do NOT render while WelcomeScreen is visible', () => {
        render(<OnboardingWalkthrough />);
        expect(screen.queryByTestId('coach-mark')).toBeNull();
    });

    it('fires trackOnboardingWelcomeShown on first visit', async () => {
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(trackOnboardingWelcomeShown).toHaveBeenCalledOnce();
        });
    });

    it('seeds demo nodes after welcome is dismissed', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(seedDemoNodes).toHaveBeenCalledWith('ws-test');
        });
    });

    it('fires trackOnboardingWelcomeDismissed after seeding', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(trackOnboardingWelcomeDismissed).toHaveBeenCalled();
        });
    });

    it('does not re-seed on re-render (seededRef guard)', () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        const { rerender } = render(<OnboardingWalkthrough />);
        rerender(<OnboardingWalkthrough />);
        expect(seedDemoNodes).toHaveBeenCalledTimes(1);
    });

    it('fires trackOnboardingStepViewed when step 1 is active', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => {
            expect(trackOnboardingStepViewed).toHaveBeenCalledWith('createNode', 0);
        });
    });

    it('onboarding signal store requestReplay triggers replay (no welcome, step 1)', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        localStorage.setItem(STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        // Initially shows nothing (completed). Replay should start step 1.
        act(() => { useOnboardingSignalStore.getState().requestReplay(); });
        await waitFor(() => {
            expect(trackOnboardingStepViewed).toHaveBeenCalledWith('createNode', 0);
        });
    });

    it('fires trackOnboardingSkipped when skip button is clicked during a step', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => expect(screen.getByTestId('mock-skip-btn')).toBeInTheDocument());
        act(() => { fireEvent.click(screen.getByTestId('mock-skip-btn')); });
        await waitFor(() => {
            expect(trackOnboardingSkipped).toHaveBeenCalled();
        });
    });

    it('fires trackOnboardingCompleted when Done is clicked on the last step', async () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        await waitFor(() => expect(screen.getByTestId('mock-next-btn')).toBeInTheDocument());
        // Advance through all 3 steps — third click is the Done action
        fireEvent.click(screen.getByTestId('mock-next-btn')); // step 1 → 2
        fireEvent.click(screen.getByTestId('mock-next-btn')); // step 2 → 3
        fireEvent.click(screen.getByTestId('mock-next-btn')); // step 3 → done
        await waitFor(() => {
            expect(trackOnboardingCompleted).toHaveBeenCalledWith(3);
        });
    });

    it('completed user sees no WelcomeScreen and no CoachMark', () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        localStorage.setItem(STORAGE_KEY, 'true');
        render(<OnboardingWalkthrough />);
        expect(screen.queryByTestId('welcome-screen')).toBeNull();
        expect(screen.queryByTestId('coach-mark')).toBeNull();
    });
});
