/**
 * Toggle — Accessible pill-style switch with optional description.
 * Single interactive control: a visually hidden checkbox with role="switch".
 * The track/knob are purely visual (aria-hidden).
 */
import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
    id: string;
}

export const Toggle = React.memo(function Toggle({ checked, onChange, label, description, disabled = false, id }: ToggleProps) {
    const descriptionId = description ? `${id}-desc` : undefined;

    return (
        <label className={styles.container} htmlFor={id}>
            <span className={styles.label}>
                <span className={styles.labelText}>{label}</span>
                {description != null && (
                    <span id={descriptionId} className={styles.description}>{description}</span>
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
                className={styles.hiddenCheckbox}
            />
            <span
                className={`${styles.track} ${checked ? styles.trackOn : ''} ${disabled ? styles.trackDisabled : ''}`}
                aria-hidden="true"
            >
                <span className={`${styles.knob} ${checked ? styles.knobOn : ''}`} />
            </span>
        </label>
    );
});
