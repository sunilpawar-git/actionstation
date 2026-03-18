/**
 * Toggle — Accessible pill-style switch with optional description.
 * Single interactive control: a visually hidden checkbox with role="switch".
 * The track/knob are purely visual (aria-hidden).
 */
import React, { useMemo, type CSSProperties } from 'react';
import clsx from 'clsx';

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
    id: string;
}

const KNOB_TRAVEL = 16;

const TRACK_BASE: CSSProperties = {
    padding: 0,
    marginTop: 2,
};

const KNOB_BASE: CSSProperties = {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'var(--color-text-on-primary)',
    transition: 'transform 150ms ease-in-out',
};

export const Toggle = React.memo(function Toggle({ checked, onChange, label, description, disabled = false, id }: ToggleProps) {
    const descriptionId = description ? `${id}-desc` : undefined;

    const trackStyle = useMemo<CSSProperties>(() => ({
        ...TRACK_BASE,
        backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
        opacity: disabled ? 0.5 : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
    }), [checked, disabled]);

    const knobStyle = useMemo<CSSProperties>(() => ({
        ...KNOB_BASE,
        transform: checked ? `translateX(${String(KNOB_TRAVEL)}px)` : 'translateX(0)',
    }), [checked]);

    return (
        <label className="relative flex items-start justify-between cursor-pointer" style={{ gap: 'var(--space-md)' }} htmlFor={id}>
            <span className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{label}</span>
                {description != null && (
                    <span id={descriptionId} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{description}</span>
                )}
            </span>
            <input
                type="checkbox"
                role="switch"
                id={id}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                aria-checked={checked}
                aria-describedby={descriptionId}
                className="peer sr-only"
            />
            <span
                className={clsx(
                    'relative w-9 h-5 min-w-[36px] rounded-[10px] shrink-0 transition-colors duration-150 ease-in-out',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-primary)] peer-focus-visible:outline-offset-2',
                )}
                style={trackStyle}
                aria-hidden="true"
            >
                <span style={knobStyle} />
            </span>
        </label>
    );
});
