/**
 * CoachMark — spotlight coach mark with optional "Try:" action prompt.
 * Portal-rendered; dismissible via Escape or Skip button.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import type { OnboardingPlacement } from '../types/onboarding';
import { CoachMarkPopup } from './CoachMarkPopup';

export interface CoachMarkProps {
    readonly targetSelector: string;
    readonly title: string;
    readonly description: string;
    readonly tryPrompt?: string;
    readonly placement: OnboardingPlacement;
    readonly stepLabel: string;
    readonly onNext: () => void;
    readonly onSkip: () => void;
    readonly nextLabel: string;
    readonly skipLabel: string;
}

const PAD = 6;

/** Portal-rendered spotlight coach mark that anchors to a CSS selector and dismisses via Escape. */
export const CoachMark = React.memo(function CoachMark(props: CoachMarkProps) {
    const { targetSelector, title, description, tryPrompt, placement,
        stepLabel, onNext, onSkip, nextLabel, skipLabel } = props;

    const [rect, setRect] = useState<DOMRect | null>(null);
    const markRef = useRef<HTMLDivElement>(null);

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onSkip);
    useFocusTrap(markRef, true);

    useEffect(() => {
        const target = document.querySelector(targetSelector);
        if (!target) return;
        const update = () => {
            const newRect = target.getBoundingClientRect();
            setRect(prev => {
                // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
                if (!prev || prev.x !== newRect.x || prev.y !== newRect.y || prev.width !== newRect.width || prev.height !== newRect.height) {
                    return newRect;
                }
                return prev;
            });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(target);
        window.addEventListener('resize', update, { passive: true });
        return () => { ro.disconnect(); window.removeEventListener('resize', update); };
    }, [targetSelector]);

    useEffect(() => { markRef.current?.focus(); }, []);

    const handleNext = useCallback(() => onNext(), [onNext]);
    const handleSkip = useCallback(() => onSkip(), [onSkip]);

    if (!rect) return null;

    const { left: l, top: t, right: r, bottom: b } = rect;
    const clipPath =
        `polygon(0% 0%,0% 100%,${l - PAD}px 100%,${l - PAD}px ${t - PAD}px,` +
        `${r + PAD}px ${t - PAD}px,${r + PAD}px ${b + PAD}px,` +
        `${l - PAD}px ${b + PAD}px,${l - PAD}px 100%,100% 100%,100% 0%)`;

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black/55 z-[var(--z-modal)] pointer-events-none" style={{ clipPath }} aria-hidden="true" data-testid="coach-mark-backdrop" />
            <CoachMarkPopup markRef={markRef} placement={placement} rect={rect} title={title} description={description} tryPrompt={tryPrompt} stepLabel={stepLabel} nextLabel={nextLabel} skipLabel={skipLabel} onNext={handleNext} onSkip={handleSkip} />
        </>,
        document.body,
    );
});
