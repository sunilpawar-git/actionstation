/**
 * TermsOfService — public page at /terms.
 */
import { LegalPage } from './LegalPage';
import { TermsContent } from './terms/TermsContent';
import { strings } from '@/shared/localization/strings';

export function TermsOfService() {
    return (
        <LegalPage title={strings.legal.termsTitle}>
            <TermsContent />
        </LegalPage>
    );
}
