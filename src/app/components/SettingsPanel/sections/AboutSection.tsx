/**
 * AboutSection — App version, changelog, bug report links, and walkthrough replay.
 */
import { strings } from '@/shared/localization/strings';
import { useOnboardingSignalStore } from '@/features/onboarding/stores/onboardingSignalStore';
import panelStyles from '../SettingsPanel.module.css';
import styles from './AccountSection.module.css';

export function AboutSection() {
    function handleReplay() {
        useOnboardingSignalStore.getState().requestReplay();
    }

    return (
        <div className={panelStyles.section}>
            <h3 className={panelStyles.sectionTitle}>{strings.settings.about}</h3>

            <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>{strings.settings.version}</span>
                <span className={styles.aboutValue}>{__APP_VERSION__}</span>
            </div>

            <div className={styles.aboutLinks}>
                <a
                    href={strings.settings.changelogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.aboutLink}
                >
                    {strings.settings.changelog}
                </a>
                <a
                    href={strings.settings.reportBugUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.aboutLink}
                >
                    {strings.settings.reportBug}
                </a>
                <button
                    className={styles.aboutLink}
                    onClick={handleReplay}
                    type="button"
                    data-testid="replay-walkthrough-btn"
                >
                    {strings.onboarding.replayWalkthrough}
                </button>
            </div>
        </div>
    );
}
