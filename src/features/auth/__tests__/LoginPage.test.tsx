/**
 * LoginPage Component Tests — Phase 4.2
 * Tests that terms / privacy links are present and navigable.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPage } from '../components/LoginPage';
import { strings } from '@/shared/localization/strings';

vi.mock('../stores/authStore', () => ({
    useAuthStore: (selector: (s: { isLoading: boolean; error: null }) => unknown) =>
        selector({ isLoading: false, error: null }),
}));

vi.mock('../hooks/useTurnstile', () => ({
    useTurnstile: () => ({ execute: vi.fn().mockResolvedValue(true), isLoading: false, error: null }),
}));

vi.mock('../services/authService', () => ({
    signInWithGoogle: vi.fn(),
}));

describe('LoginPage — terms and privacy links', () => {
    it('renders a link to /terms', () => {
        render(<LoginPage />);
        const link = screen.getByRole('link', { name: strings.auth.termsOfServiceLabel });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/terms');
    });

    it('renders a link to /privacy', () => {
        render(<LoginPage />);
        const link = screen.getByRole('link', { name: strings.auth.privacyPolicyLabel });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/privacy');
    });

    it('terms link opens in same tab (no target=_blank)', () => {
        render(<LoginPage />);
        const link = screen.getByRole('link', { name: strings.auth.termsOfServiceLabel });
        expect(link).not.toHaveAttribute('target', '_blank');
    });

    it('privacy link opens in same tab (no target=_blank)', () => {
        render(<LoginPage />);
        const link = screen.getByRole('link', { name: strings.auth.privacyPolicyLabel });
        expect(link).not.toHaveAttribute('target', '_blank');
    });

    it('renders app name heading', () => {
        render(<LoginPage />);
        expect(screen.getByRole('heading', { level: 1, name: strings.app.name })).toBeInTheDocument();
    });

    it('renders sign-in button', () => {
        render(<LoginPage />);
        expect(screen.getByRole('button', { name: strings.auth.signInWithGoogle })).toBeInTheDocument();
    });
});
