/**
 * CoachMarkPopup — inner popup card for a coach mark step.
 * Extracted from CoachMark to keep that component within the 100-line limit.
 */
import clsx from 'clsx';
import type { OnboardingPlacement } from '../types/onboarding';

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

export interface CoachMarkPopupProps {
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
export function CoachMarkPopup({ markRef, placement, rect, title, description, tryPrompt, stepLabel, nextLabel, skipLabel, onNext, onSkip }: CoachMarkPopupProps) {
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
