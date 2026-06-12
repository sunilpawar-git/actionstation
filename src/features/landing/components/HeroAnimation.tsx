/**
 * HeroAnimation — SVG canvas demo for the landing page hero section.
 * Pure CSS transitions, no Zustand, no ReactFlow.
 * Forced dark so the canvas demo always shows on a dark background.
 */
import { useId } from 'react';
import { strings } from '@/shared/localization/strings';
import type { AnimationPhase } from '../hooks/useHeroAnimation';
import {
    NODES, EDGES, SYNTH_NODE,
    getNodeOpacity, getEdgeOpacity, getSynthOpacity,
} from '../data/heroAnimationData';

interface HeroAnimationProps {
    readonly phase: AnimationPhase;
    readonly reducedMotion: boolean;
}

/** Animated SVG canvas demo showing nodes, edges, and synthesis. */
export function HeroAnimation({ phase, reducedMotion }: HeroAnimationProps) {
    const patternId = useId();
    const nodeOpacity = getNodeOpacity(phase, reducedMotion);
    const edgeOpacity = getEdgeOpacity(phase, reducedMotion);
    const synthOpacity = getSynthOpacity(phase, reducedMotion);
    const transition = reducedMotion ? 'none' : 'opacity 0.5s ease-in-out';

    return (
        // data-theme="dark" forces CSS variables to dark values so the canvas
        // demo always renders as a dark workspace regardless of the app theme.
        <div data-theme="dark">
            <svg
                viewBox="0 0 400 240"
                className="w-full h-auto"
                aria-label={strings.landing.hero.animationAriaLabel}
                role="img"
                style={{ maxWidth: 480 }}
            >
                <rect width="400" height="240" rx="12" style={{ fill: 'var(--color-background)' }} />
                <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" style={{ fill: 'var(--color-surface-hover)' }} />
                </pattern>
                <rect width="400" height="240" rx="12" fill={`url(#${patternId})`} />

                {EDGES.map((edge) => (
                    <line
                        key={`edge-${edge.x1}-${edge.y1}-${edge.x2}-${edge.y2}`}
                        x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                        strokeWidth="1.5"
                        opacity={edgeOpacity}
                        style={{ stroke: 'var(--color-primary)', transition }}
                    />
                ))}

                {NODES.map((node) => (
                    <g key={`node-${node.label}`} opacity={nodeOpacity} style={{ transition }}>
                        <rect
                            x={node.x} y={node.y} width="100" height="32" rx="6"
                            style={{ fill: 'var(--color-surface-elevated)', stroke: 'var(--node-border)' }}
                            strokeWidth="1"
                        />
                        <text
                            x={node.x + 50} y={node.y + 20}
                            textAnchor="middle"
                            fontSize="11" fontFamily="system-ui, sans-serif"
                            style={{ fill: 'var(--color-text-primary)' }}
                        >
                            {node.label}
                        </text>
                    </g>
                ))}

                <g opacity={synthOpacity} style={{ transition }}>
                    <rect
                        x={SYNTH_NODE.x} y={SYNTH_NODE.y} width="120" height="32" rx="6"
                        style={{ fill: 'var(--node-ai-bg)', stroke: 'var(--color-primary)' }}
                        strokeWidth="1.5"
                    />
                    <text
                        x={SYNTH_NODE.x + 14} y={SYNTH_NODE.y + 20}
                        fontSize="11" fontFamily="system-ui, sans-serif"
                        style={{ fill: 'var(--color-primary)' }}
                    >
                        {strings.landing.hero.synthNodeIcon}{SYNTH_NODE.label}
                    </text>
                </g>
            </svg>
        </div>
    );
}
