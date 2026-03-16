/**
 * CoachMark — spotlight coach mark with optional "Try:" action prompt.
 * Portal-rendered; dismissible via Escape or Skip button.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import clsx from 'clsx';
import type { OnboardingPlacement } from '../types/onboarding';

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

/** Computes fixed-position CSS for the coach mark popup relative to the target element and placement. */
function computePosition(rect: DOMRect, placement: OnboardingPlacement): React.CSSProperties {
    const gap = PAD + 12;
    switch (placement) {
        case 'right': return { position: 'fixed', left: rect.right + gap, top: rect.top };
        case 'left': return { position: 'fixed', right: window.innerWidth - rect.left + gap, top: rect.top };
        case 'bottom': return { position: 'fixed', left: rect.left, top: rect.bottom + gap };
        case 'top': return { position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + gap };
    }
}

const ARROW_CLASSES: Record<OnboardingPlacement, string> = {
    right: 'before:content-[""] before:absolute before:left-[-7px] before:top-[14px] before:border-y-[7px] before:border-y-transparent before:border-r-[7px] before:border-r-[var(--color-surface-elevated)]',
    left:  'before:content-[""] before:absolute before:right-[-7px] before:top-[14px] before:border-y-[7px] before:border-y-transparent before:border-l-[7px] before:border-l-[var(--color-surface-elevated)]',
    bottom:'before:content-[""] before:absolute before:top-[-7px] before:left-[14px] before:border-x-[7px] before:border-x-transparent before:border-b-[7px] before:border-b-[var(--color-surface-elevated)]',
    top:   'before:content-[""] before:absolute before:bottom-[-7px] before:left-[14px] before:border-x-[7px] before:border-x-transparent before:border-t-[7px] before:border-t-[var(--color-surface-elevated)]',
};

interface CoachMarkPopupProps {
    markRef: React.RefObject<HTMLDivElement>;
    placement: OnboardingPlacement;
    rect: DOMRect;
    title: string;
    description: string;
    tryPrompt?: string;
    stepLabel: string;
    nextLabel: string;
    skipLabel: string;
    onNext: () => void;
    onSkip: () => void;
}

/** Inner popup card for a coach mark step; shows title, description, optional try-prompt, and nav buttons. */
function CoachMarkPopup({ markRef, placement, rect, title, description, tryPrompt, stepLabel, nextLabel, skipLabel, onNext, onSkip }: CoachMarkPopupProps) {
    return (
        <div
            ref={markRef}
            className={clsx('fixed z-[calc(var(--z-modal)+1)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[0_8px_24px_rgba(0,0,0,0.2)] pointer-events-auto outline-none', ARROW_CLASSES[placement])}
            style={{ ...computePosition(rect, placement), maxWidth: 280, padding: 'var(--space-lg)' }}
            role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} data-testid="coach-mark"
        >
            <span className="block text-[var(--color-text-muted)]" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-xs)' }}>{stepLabel}</span>
            <h3 className="font-semibold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-base)', margin: '0 0 var(--space-xs)' }}>{title}</h3>
            <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>{description}</p>
            {tryPrompt && (
                <p className="text-[var(--color-primary)] font-medium rounded-sm" style={{ marginTop: 'var(--space-xs)', marginBottom: 0, padding: 'var(--space-xs) var(--space-sm)', background: 'var(--color-primary-light)', fontSize: 'var(--font-size-xs)' }} data-testid="try-prompt">
                    {tryPrompt}
                </p>
            )}
            <div className="flex justify-between items-center" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <button className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]" style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-sm)', padding: 0 }} onClick={onSkip} type="button">{skipLabel}</button>
                <button className="text-[var(--color-text-on-primary)] font-medium rounded-md cursor-pointer transition-colors duration-150 ease-in-out" style={{ background: 'var(--color-primary)', border: 'none', padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--font-size-sm)' }} onClick={onNext} type="button">{nextLabel}</button>
            </div>
        </div>
    );
}

/** Portal-rendered spotlight coach mark that anchors to a CSS selector and dismisses via Escape. */
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
            <div className="fixed inset-0 bg-black/55 z-[var(--z-modal)] pointer-events-none" style={{ clipPath }} aria-hidden="true" data-testid="coach-mark-backdrop" />
            <CoachMarkPopup markRef={markRef} placement={placement} rect={rect} title={title} description={description} tryPrompt={tryPrompt} stepLabel={stepLabel} nextLabel={nextLabel} skipLabel={skipLabel} onNext={handleNext} onSkip={handleSkip} />
        </>,
        document.body,
    );
});
