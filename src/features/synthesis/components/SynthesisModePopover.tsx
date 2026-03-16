/** SynthesisModePopover — four-mode picker for synthesis type */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';

interface SynthesisModePopoverProps {
    readonly onSelect: (mode: SynthesisMode) => void;
    readonly onClose: () => void;
}

const MODES: readonly SynthesisMode[] = ['summarize', 'outline', 'narrative', 'questions'];

/** Keyboard-navigable popover for selecting one of the four synthesis modes. */
export const SynthesisModePopover = React.memo(function SynthesisModePopover({
    onSelect,
    onClose,
}: SynthesisModePopoverProps) {
    const [focusIndex, setFocusIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const buttons = listRef.current?.querySelectorAll('button');
        buttons?.[focusIndex]?.focus();
    }, [focusIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusIndex((i) => (i + 1) % MODES.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusIndex((i) => (i - 1 + MODES.length) % MODES.length);
                    break;
                case 'Enter': {
                    e.preventDefault();
                    const selected = MODES[focusIndex];
                    if (selected !== undefined) onSelect(selected);
                    break;
                }
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [focusIndex, onSelect, onClose]
    );

    return (
        <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-dropdown)] min-w-[200px] z-[var(--z-dropdown)] flex flex-col"
            style={{ marginBottom: 4, padding: 4, gap: 2 }}
            role="listbox"
            aria-label={synthesisStrings.labels.synthesize}
            ref={listRef}
            onKeyDown={handleKeyDown}
        >
            {MODES.map((mode, idx) => (
                <button
                    key={mode}
                    className="flex flex-col items-start border-none rounded-md cursor-pointer text-left w-full transition-colors duration-150 ease-in-out hover:bg-[var(--color-hover)] focus-visible:bg-[var(--color-hover)] focus-visible:outline-none"
                    style={{ background: idx === focusIndex ? 'var(--color-primary-light)' : 'transparent', gap: 2, padding: '8px 16px' }}
                    role="option"
                    aria-selected={idx === focusIndex}
                    onClick={() => onSelect(mode)}
                    tabIndex={idx === focusIndex ? 0 : -1}
                    type="button"
                >
                    <span className="font-medium text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-sm)' }}>{synthesisStrings.modes[mode]}</span>
                    <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {synthesisStrings.modeDescriptions[mode]}
                    </span>
                </button>
            ))}
        </div>
    );
});
