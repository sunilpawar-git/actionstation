/**
 * Error Boundary - Graceful error handling
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { strings } from '@/shared/localization/strings';
import { logger } from '@/shared/services/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/** React class error boundary providing a retry-able fallback UI for unexpected render errors. */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    /** Captures the thrown error in state, triggering the fallback UI on the next render. */
    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    /** Logs the error and component stack to the monitoring service. */
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('[ErrorBoundary] Caught error:', error, {
            componentStack: errorInfo.componentStack ?? '',
            errorStack: error.stack ?? '',
        });
    }

    /** Resets error state to unmount the fallback and re-render children. */
    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    /** Renders fallback UI with a retry button on error, or children when healthy. */
    render() {
        if (this.state.hasError) {
            if (this.props.fallback != null) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-screen p-[var(--space-xl)] bg-[var(--color-background)]">
                    <div className="text-center p-[var(--space-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] max-w-[400px]">
                        <div className="text-5xl" style={{ marginBottom: 16 }}>⚠️</div>
                        <h2 className="font-semibold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-xl)', marginBottom: 8 }}>{strings.errors.generic}</h2>
                        <p className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 24 }}>
                            {this.state.error?.message ?? 'An unexpected error occurred'}
                        </p>
                        <button className="text-white rounded-md font-medium transition-colors duration-150 ease-in-out" style={{ background: 'var(--color-primary)', padding: '8px var(--space-xl)' }} onClick={this.handleRetry}>
                            {strings.common.retry}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
