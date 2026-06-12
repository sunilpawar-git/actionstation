/**
 * useHeroAnimation — Drives the landing page canvas demo animation.
 * State machine running in useReducer; respects prefers-reduced-motion.
 */
import { useReducer, useEffect } from 'react';
import {
    type AnimationState,
    type AnimationAction,
    animationReducer,
    PHASE_SEQUENCE,
} from '../data/heroAnimationData';

export type { AnimationPhase } from '../data/heroAnimationData';

/** Detects and tracks prefers-reduced-motion, dispatching state updates. */
function useReducedMotion(dispatch: React.Dispatch<AnimationAction>): void {
    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        dispatch({ type: 'SET_REDUCED_MOTION', value: mql.matches });
        const handler = (e: MediaQueryListEvent) =>
            dispatch({ type: 'SET_REDUCED_MOTION', value: e.matches });
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [dispatch]);
}

/** Loops through animation phases with configurable timing. */
export function useHeroAnimation(): AnimationState {
    const [state, dispatch] = useReducer(animationReducer, {
        phase: 'idle',
        reducedMotion: false,
    });

    useReducedMotion(dispatch);

    useEffect(() => {
        if (state.reducedMotion) return;
        let stepIndex = 0;
        let timer: ReturnType<typeof setTimeout>;
        let cancelled = false;
        const scheduleNext = () => {
            const step = PHASE_SEQUENCE[stepIndex % PHASE_SEQUENCE.length];
            if (!step || cancelled) return;
            timer = setTimeout(() => {
                if (cancelled) return;
                dispatch({ type: 'ADVANCE', phase: step.phase });
                stepIndex = (stepIndex + 1) % PHASE_SEQUENCE.length;
                scheduleNext();
            }, step.delay);
        };
        scheduleNext();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [state.reducedMotion]);

    return state;
}
