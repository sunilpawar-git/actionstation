/**
 * CoachMark — spotlight coach mark with optional "Try:" action prompt.
 * Portal-rendered; dismissible via Escape or Skip button.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import type { OnboardingPlacement } from '../types/onboarding';
import styles from './CoachMark.module.css';

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

function computePosition(rect: DOMRect, placement: OnboardingPlacement): React.CSSProperties {
    const gap = PAD + 12;
    switch (placement) {
        case 'right': return { position: 'fixed', left: rect.right + gap, top: rect.top };
        case 'left': return { position: 'fixed', right: window.innerWidth - rect.left + gap, top: rect.top };
        case 'bottom': return { position: 'fixed', left: rect.left, top: rect.bottom + gap };
        case 'top': return { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + gap };
    }
}

export const CoachMark = React.memo(function CoachMark(props: CoachMarkProps) {
    const { targetSelector, title, description, tryPrompt, placement,
        stepLabel, onNext, onSkip, nextLabel, skipLabel } = props;

    const [rect, setRect] = useState<DOMRect | null>(null);
    const markRef = useRef<HTMLDivElement>(null);

    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onSkip);

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
            <div
                className={styles.backdrop}
                style={{ clipPath }}
                aria-hidden="true"
                data-testid="coach-mark-backdrop"
            />
            <div
                ref={markRef}
                className={`${styles.coachMark} ${styles[placement]}`}
                style={computePosition(rect, placement)}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                data-testid="coach-mark"
            >
                <span className={styles.step}>{stepLabel}</span>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
                {tryPrompt && (
                    <p className={styles.tryPrompt} data-testid="try-prompt">{tryPrompt}</p>
                )}
                <div className={styles.actions}>
                    <button className={styles.skipBtn} onClick={handleSkip} type="button">
                        {skipLabel}
                    </button>
                    <button className={styles.nextBtn} onClick={handleNext} type="button">
                        {nextLabel}
                    </button>
                </div>
            </div>
        </>,
        document.body,
    );
});
