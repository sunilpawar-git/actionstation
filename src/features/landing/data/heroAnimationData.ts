/**
 * heroAnimationData — Layout data, opacity helpers, and state machine primitives
 * for the canvas demo SVG.
 * Extracted from HeroAnimation and useHeroAnimation to keep each file under limits.
 *
 * SVG coordinate layout (viewBox 400×240):
 *   Node A (Capture):    x=60,  y=40   → top-left
 *   Node B (Connect):    x=260, y=50   → top-right
 *   Node C (Synthesize): x=160, y=160  → bottom-center
 *   Synth node (output): x=120, y=110  → center
 *   Edges: A→B, A→C, B→C (triangle connecting all steps)
 */
import { strings } from '@/shared/localization/strings';

// ─── Animation state machine types ───────────────────────────────────────────

export type AnimationPhase = 'idle' | 'nodesVisible' | 'edgesDrawn' | 'synthesized';

export interface AnimationState {
    readonly phase: AnimationPhase;
    readonly reducedMotion: boolean;
}

export type AnimationAction =
    | { type: 'ADVANCE'; phase: AnimationPhase }
    | { type: 'SET_REDUCED_MOTION'; value: boolean };

export function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
    switch (action.type) {
        case 'ADVANCE':
            return { ...state, phase: action.phase };
        case 'SET_REDUCED_MOTION':
            return { ...state, reducedMotion: action.value };
        default:
            return state;
    }
}

export const PHASE_SEQUENCE: ReadonlyArray<{ phase: AnimationPhase; delay: number }> = [
    { phase: 'nodesVisible', delay: 500 },
    { phase: 'edgesDrawn', delay: 1000 },
    { phase: 'synthesized', delay: 1000 },
    { phase: 'idle', delay: 2500 },
] as const;

// ─── SVG layout data ──────────────────────────────────────────────────────────

export const NODE_LABELS = [
    strings.landing.howItWorks.steps[0].title,
    strings.landing.howItWorks.steps[1].title,
    strings.landing.howItWorks.steps[2].title,
] as const;

export const NODES = [
    { x: 60, y: 40, label: NODE_LABELS[0] },
    { x: 260, y: 50, label: NODE_LABELS[1] },
    { x: 160, y: 160, label: NODE_LABELS[2] },
] as const;

export const EDGES = [
    { x1: 130, y1: 55, x2: 250, y2: 60 },
    { x1: 130, y1: 60, x2: 160, y2: 150 },
    { x1: 310, y1: 70, x2: 220, y2: 150 },
] as const;

export const SYNTH_NODE = {
    x: 120,
    y: 110,
    label: strings.landing.hero.synthNodeLabel,
} as const;

// ─── Opacity helpers ──────────────────────────────────────────────────────────

export function getNodeOpacity(phase: AnimationPhase, reducedMotion: boolean): number {
    if (reducedMotion) return 1;
    return phase === 'idle' ? 0 : 1;
}

export function getEdgeOpacity(phase: AnimationPhase, reducedMotion: boolean): number {
    if (reducedMotion) return 1;
    if (phase === 'edgesDrawn' || phase === 'synthesized') return 1;
    return 0;
}

export function getSynthOpacity(phase: AnimationPhase, reducedMotion: boolean): number {
    if (reducedMotion) return 1;
    return phase === 'synthesized' ? 1 : 0;
}
