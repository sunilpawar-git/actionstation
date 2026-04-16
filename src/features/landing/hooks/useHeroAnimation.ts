/**
 * useHeroAnimation — State machine for the landing page canvas demo animation.
 * Uses useReducer, completely isolated from Zustand and canvas store.
 * Respects prefers-reduced-motion media query.
 */
import { useReducer, useEffect } from 'react';

export type AnimationPhase = 'idle' | 'nodesVisible' | 'edgesDrawn' | 'synthesized';

interface AnimationState {
    readonly phase: AnimationPhase;
    readonly reducedMotion: boolean;
}

type AnimationAction =
    | { type: 'ADVANCE'; phase: AnimationPhase }
    | { type: 'SET_REDUCED_MOTION'; value: boolean };

function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
    switch (action.type) {
        case 'ADVANCE':
            return { ...state, phase: action.phase };
        case 'SET_REDUCED_MOTION':
            return { ...state, reducedMotion: action.value };
        default:
            return state;
    }
}

const PHASE_SEQUENCE: ReadonlyArray<{ phase: AnimationPhase; delay: number }> = [
    { phase: 'nodesVisible', delay: 500 },
    { phase: 'edgesDrawn', delay: 1000 },
    { phase: 'synthesized', delay: 1000 },
    { phase: 'idle', delay: 2500 },
] as const;

/** Loops through animation phases with configurable timing. */
export function useHeroAnimation(): AnimationState {
    const [state, dispatch] = useReducer(animationReducer, {
        phase: 'idle',
        reducedMotion: false,
    });

    // Detect prefers-reduced-motion
    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        dispatch({ type: 'SET_REDUCED_MOTION', value: mql.matches });
        const handler = (e: MediaQueryListEvent) => {
            dispatch({ type: 'SET_REDUCED_MOTION', value: e.matches });
        };
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // Phase loop — skip if reduced motion
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
