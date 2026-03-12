/**
 * onboardingSignalStore — Tiny Zustand store for cross-feature onboarding signals.
 *
 * Replaces the `window.dispatchEvent(new CustomEvent('onboarding:replay'))`
 * coupling between AboutSection and OnboardingWalkthrough.
 *
 * The store holds a monotonically increasing counter. Each call to
 * `requestReplay()` bumps it; the consumer (OnboardingWalkthrough) watches
 * the counter via `useEffect` and triggers its internal replay logic.
 */
import { create } from 'zustand';

interface OnboardingSignalState {
    /** Bumped by `requestReplay()`. Consumers react to changes. */
    replayRequestCount: number;
    /** Call from any feature to request an onboarding replay. */
    requestReplay: () => void;
}

export const useOnboardingSignalStore = create<OnboardingSignalState>((set) => ({
    replayRequestCount: 0,
    requestReplay: () => set((s) => ({ replayRequestCount: s.replayRequestCount + 1 })),
}));
