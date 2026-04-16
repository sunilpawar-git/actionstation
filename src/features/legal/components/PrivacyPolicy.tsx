/**
 * PrivacyPolicy — public page at /privacy.
 */
import { LegalPage } from './LegalPage';
import { PrivacyContent } from './privacy/PrivacyContent';
import { strings } from '@/shared/localization/strings';

export function PrivacyPolicy() {
    return (
        <LegalPage title={strings.legal.privacyTitle}>
            <PrivacyContent />
        </LegalPage>
    );
}
