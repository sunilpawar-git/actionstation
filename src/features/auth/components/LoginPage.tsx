/**
 * Login Page - Google OAuth sign-in
 */
import { strings } from '@/shared/localization/strings';
import { signInWithGoogle } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

/** Google "G" logo SVG used inside the sign-in button. */
function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

/** App logo mark displayed at the top of the sign-in card. */
function LoginLogo() {
    return (
        <div style={{ marginBottom: 32 }}>
            <div
                className="flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--color-primary)', boxShadow: '0 4px 16px hsla(220, 65%, 50%, 0.35)' }}
            >
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <path d="M16 24L22 30L32 18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
}

/** Inline error alert rendered when sign-in fails. */
function LoginError({ message }: { message: string }) {
    return (
        <div
            className="w-full text-center"
            style={{ padding: '12px 16px', background: 'hsl(0, 72%, 96%)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginBottom: 24 }}
            role="alert"
        >
            {message}
        </div>
    );
}

/** "Sign in with Google" button with loading-spinner state. */
function LoginButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) {
    return (
        <button
            className="flex items-center justify-center w-full text-[var(--color-text-primary)] transition-all duration-150 ease-in-out cursor-pointer disabled:cursor-not-allowed"
            style={{ gap: 10, padding: '14px 24px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', boxShadow: '0 1px 3px hsla(220, 13%, 13%, 0.08)', opacity: isLoading ? 0.7 : 1 }}
            onClick={onClick}
            disabled={isLoading}
            aria-busy={isLoading}
        >
            {isLoading ? (
                <span className="rounded-full animate-spin flex-shrink-0" style={{ width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} aria-hidden="true" />
            ) : (
                <GoogleIcon />
            )}
            <span>{isLoading ? strings.auth.signingIn : strings.auth.signInWithGoogle}</span>
        </button>
    );
}

/** Full-page Google OAuth sign-in screen. */
export function LoginPage() {
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);

    const handleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch {
            // Error is handled in authService
        }
    };

    return (
        <div
            className="flex items-center justify-center"
            style={{ minHeight: '100vh', width: '100%', background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-background) 50%, hsl(260, 80%, 96%) 100%)' }}
        >
            <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }}>
                <div
                    className="flex flex-col items-center"
                    style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: 'var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '56px 48px 48px', boxShadow: '0 8px 40px hsla(220, 40%, 20%, 0.12)' }}
                >
                    <LoginLogo />
                    <h1 className="font-bold text-[var(--color-text-primary)] text-center" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                        {strings.app.name}
                    </h1>
                    <p className="text-[var(--color-text-secondary)] text-center" style={{ fontSize: 'var(--font-size-base)', marginBottom: 40, lineHeight: 1.6 }}>
                        {strings.app.tagline}
                    </p>
                    {error && <LoginError message={error} />}
                    <LoginButton isLoading={isLoading} onClick={handleSignIn} />
                    <p className="text-[var(--color-text-muted)] text-center" style={{ fontSize: 'var(--font-size-xs)', marginTop: 32, lineHeight: 1.6 }}>
                        {strings.auth.termsNote}
                    </p>
                </div>
            </div>
        </div>
    );
}
