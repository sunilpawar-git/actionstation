/**
 * Legal Page Content Tests — Phase 4.2
 * TDD: Written before TermsContent + PrivacyContent are filled in.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TermsOfService } from '../components/TermsOfService';
import { PrivacyPolicy } from '../components/PrivacyPolicy';
import { strings } from '@/shared/localization/strings';

describe('TermsOfService content', () => {
    it('renders Acceptance of Terms section heading', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { name: /Acceptance of Terms/i })).toBeInTheDocument();
    });

    it('renders Use of the Service section heading', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { name: /Use of the Service/i })).toBeInTheDocument();
    });

    it('renders Limitation of Liability section heading', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { name: /Limitation of Liability/i })).toBeInTheDocument();
    });

    it('renders Termination section heading', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { name: /Termination/i })).toBeInTheDocument();
    });

    it('renders Contact section heading', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { name: /Contact/i })).toBeInTheDocument();
    });

    it('renders page title from strings', () => {
        render(<TermsOfService />);
        expect(screen.getByRole('heading', { level: 1, name: strings.legal.termsTitle })).toBeInTheDocument();
    });

    it('renders last updated date', () => {
        render(<TermsOfService />);
        expect(screen.getByText(new RegExp(strings.legal.lastUpdatedValue))).toBeInTheDocument();
    });
});

describe('PrivacyPolicy content', () => {
    it('renders Information We Collect section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Information We Collect/i })).toBeInTheDocument();
    });

    it('renders Third-Party Services section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Third.Party Services/i })).toBeInTheDocument();
    });

    it('renders Data Retention section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Data Retention/i })).toBeInTheDocument();
    });

    it('renders Your Rights section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Your Rights/i })).toBeInTheDocument();
    });

    it('renders Cookies and Analytics section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Cookies/i })).toBeInTheDocument();
    });

    it('renders Contact section heading', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { name: /Contact/i })).toBeInTheDocument();
    });

    it('renders page title from strings', () => {
        render(<PrivacyPolicy />);
        expect(screen.getByRole('heading', { level: 1, name: strings.legal.privacyTitle })).toBeInTheDocument();
    });
});
