/**
 * SegmentedControl — Accessible horizontal radio pill group.
 * Each option uses a visually hidden radio input for native semantics.
 */
import React from 'react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface SegmentOption<T extends string> {
    value: T;
    label: string;
    preview?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
    name: string;
    label: string;
    options: ReadonlyArray<SegmentOption<T>>;
    value: T;
    onChange: (value: T) => void;
}

/** Accessible horizontal radio pill group; each option uses a visually hidden radio for native semantics. */
function SegmentedControlInner<T extends string>({
    name,
    label,
    options,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    return (
        <div className="flex border border-[var(--color-border)] rounded-md overflow-hidden" role="radiogroup" aria-label={label}>
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <label
                        key={option.value}
                        className={clsx(
                            'flex-1 flex items-center justify-center text-center text-[var(--color-text-secondary)] cursor-pointer transition-all duration-150 ease-in-out border-r border-[var(--color-border)] last:border-r-0 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-[var(--color-primary)] has-[input:focus-visible]:outline-offset-[-2px]',
                            isActive
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                                : 'hover:bg-[var(--color-surface-hover)]'
                        )}
                        style={{ fontSize: 'var(--font-size-sm)', gap: 4, padding: '4px 8px' }}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={isActive}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        {option.preview != null && <span className="flex items-center">{option.preview}</span>}
                        <span className="whitespace-nowrap">{option.label}</span>
                    </label>
                );
            })}
        </div>
    );
}

export const SegmentedControl = React.memo(SegmentedControlInner) as typeof SegmentedControlInner;
