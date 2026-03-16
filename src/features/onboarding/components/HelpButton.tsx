/**
 * HelpButton — persistent "?" button; hidden while onboarding is active.
 * Opens ShortcutsPanel; triggers replay via onReplay prop.
 *
 * Prop-driven visibility: parent (OnboardingWalkthrough) holds the single
 * useOnboarding() instance and derives isOnboardingActive, ensuring a single
 * reducer state machine governs both the walkthrough and this button.
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { ShortcutsPanel } from './ShortcutsPanel';

export interface HelpButtonProps {
    readonly isOnboardingActive: boolean; // true while WelcomeScreen OR coach marks are showing
    readonly onReplay:           () => void;
}

/** Persistent "?" floating button that opens the ShortcutsPanel; hidden during active onboarding. */
export const HelpButton = React.memo(function HelpButton({
    isOnboardingActive,
    onReplay,
}: HelpButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = useCallback(() => setIsOpen((v) => !v), []);
    const close  = useCallback(() => setIsOpen(false),     []);

    const handleReplay = useCallback(() => {
        setIsOpen(false);
        onReplay();
    }, [onReplay]);

    // Don't stack escape handlers — hide during active onboarding
    if (isOnboardingActive) return null;

    return (
        <>
            <button
                className="fixed bottom-6 right-6 z-[var(--z-sticky)] w-9 h-9 rounded-full text-[var(--color-text-secondary)] font-semibold cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center transition-colors duration-150 ease-in-out"
                style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}
                onClick={toggle}
                aria-label={strings.onboarding.helpButtonLabel}
                aria-expanded={isOpen}
                type="button"
                data-testid="help-button"
            >
                ?
            </button>
            {isOpen && <ShortcutsPanel onClose={close} onReplay={handleReplay} />}
        </>
    );
});
