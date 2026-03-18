/**
 * ConnectorStylePicker — Vertical radio list for selecting connector styles.
 * Replaces a horizontal SegmentedControl which clips at 5 options.
 * Uses ConnectorPreview SVG + label per row. Fully accessible (radiogroup).
 */
import React from 'react';
import type { ConnectorStyle } from '@/shared/stores/settingsStore';
import { ConnectorPreview } from './ConnectorPreview';
import { strings } from '@/shared/localization/strings';
import './connectorFocus.css';
import {
    CSP_CONTAINER, CSP_OPTION, CSP_OPTION_STYLE, CSP_OPTION_ACTIVE_STYLE,
    CSP_HIDDEN_RADIO, CSP_PREVIEW, CSP_LABEL, CSP_CHECKMARK, CSP_CHECKMARK_STYLE,
} from './connectorStylePickerStyles';

interface ConnectorStyleOption {
    value: ConnectorStyle;
    label: string;
}

const OPTIONS: ConnectorStyleOption[] = [
    { value: 'ghost', label: strings.settings.connectorGhost },
    { value: 'regular', label: strings.settings.connectorRegular },
    { value: 'light', label: strings.settings.connectorLight },
    { value: 'bold', label: strings.settings.connectorBold },
    { value: 'dashed', label: strings.settings.connectorDashed },
    { value: 'dotted', label: strings.settings.connectorDotted },
];

interface ConnectorStylePickerProps {
    value: ConnectorStyle;
    onChange: (value: ConnectorStyle) => void;
}

export const ConnectorStylePicker = React.memo(function ConnectorStylePicker({
    value,
    onChange,
}: ConnectorStylePickerProps) {
    return (
        <div
            className={CSP_CONTAINER}
            role="radiogroup"
            aria-label={strings.settings.connectorStyle}
        >
            {OPTIONS.map((option) => {
                const isActive = option.value === value;
                return (
                    <label
                        key={option.value}
                        className={`${CSP_OPTION} connector-option`}
                        style={isActive ? CSP_OPTION_ACTIVE_STYLE : CSP_OPTION_STYLE}
                    >
                        <input
                            type="radio"
                            name="connectorStyle"
                            value={option.value}
                            checked={isActive}
                            onChange={() => onChange(option.value)}
                            className={CSP_HIDDEN_RADIO}
                            aria-label={option.label}
                        />
                        <span className={CSP_PREVIEW}>
                            <ConnectorPreview style={option.value} />
                        </span>
                        <span className={CSP_LABEL}>{option.label}</span>
                        {isActive && (
                            <span className={CSP_CHECKMARK} style={CSP_CHECKMARK_STYLE} aria-hidden="true">✓</span>
                        )}
                    </label>
                );
            })}
        </div>
    );
});
