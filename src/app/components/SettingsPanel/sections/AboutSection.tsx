/**
 * AboutSection — App version, changelog, bug report links, and walkthrough replay.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useOnboardingSignalStore } from '@/features/onboarding/stores/onboardingSignalStore';
import { SettingsGroup } from './SettingsGroup';
import { SP_SECTION, SP_SECTION_STYLE } from '../settingsPanelStyles';
import {
    ABOUT_ROW, ABOUT_ROW_STYLE, ABOUT_LABEL, ABOUT_LABEL_STYLE,
    ABOUT_VALUE, ABOUT_VALUE_STYLE, ABOUT_LINKS, ABOUT_LINKS_STYLE,
    ABOUT_LINK, ABOUT_LINK_STYLE,
} from './accountSectionStyles';

export const AboutSection = React.memo(function AboutSection() {
    function handleReplay() {
        useOnboardingSignalStore.getState().requestReplay();
    }

    return (
        <div className={SP_SECTION} style={SP_SECTION_STYLE}>
            <SettingsGroup title={strings.settings.about}>
                <div className={ABOUT_ROW} style={ABOUT_ROW_STYLE}>
                    <span className={ABOUT_LABEL} style={ABOUT_LABEL_STYLE}>
                        {strings.settings.version}
                    </span>
                    <span className={ABOUT_VALUE} style={ABOUT_VALUE_STYLE}>
                        {__APP_VERSION__}
                    </span>
                </div>

                <div className={ABOUT_LINKS} style={ABOUT_LINKS_STYLE}>
                    <a
                        href={strings.settings.changelogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ABOUT_LINK}
                        style={ABOUT_LINK_STYLE}
                    >
                        {strings.settings.changelog}
                    </a>
                    <a
                        href={strings.settings.reportBugUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ABOUT_LINK}
                        style={ABOUT_LINK_STYLE}
                    >
                        {strings.settings.reportBug}
                    </a>
                    <button
                        className={ABOUT_LINK}
                        style={ABOUT_LINK_STYLE}
                        onClick={handleReplay}
                        type="button"
                        data-testid="replay-walkthrough-btn"
                    >
                        {strings.onboarding.replayWalkthrough}
                    </button>
                </div>
            </SettingsGroup>
        </div>
    );
});
