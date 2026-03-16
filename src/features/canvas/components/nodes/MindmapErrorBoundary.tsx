/**
 * MindmapErrorBoundary — Catches rendering errors inside MindmapRenderer
 * and shows a graceful fallback with retry and switch-to-text options.
 *
 * Uses React class-based error boundary (required by React API).
 * Reports errors to Sentry via captureError.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';

interface Props {
    children: React.ReactNode;
    onSwitchToText?: () => void;
}
interface State { hasError: boolean; }

/** React error boundary catching MindmapRenderer failures; shows retry/switch-to-text fallback. */
export class MindmapErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    /** Sets error state to trigger the fallback UI on the next render cycle. */
    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    /** Reports the caught error to Sentry. */
    componentDidCatch(error: Error): void {
        captureError(error);
    }

    /** Resets error state so the child tree is re-mounted. */
    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    /** Resets error state and delegates to the onSwitchToText prop. */
    private handleSwitchToText = () => {
        this.setState({ hasError: false });
        this.props.onSwitchToText?.();
    };

    /** Renders fallback UI on error, or children when healthy. */
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center w-full min-h-[80px]" style={{ gap: 8, padding: 16 }} data-testid="mindmap-error-fallback">
                    <p className="text-[var(--color-text-secondary)] italic" style={{ fontSize: 'var(--font-size-sm)' }}>{strings.canvas.mindmap.errorFallback}</p>
                    <div className="flex" style={{ gap: 8 }}>
                        <button className="rounded-sm text-[var(--color-text-primary)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-xs)', padding: '4px 8px' }} onClick={this.handleRetry}>
                            {strings.canvas.mindmap.errorRetry}
                        </button>
                        {this.props.onSwitchToText && (
                            <button className="rounded-sm text-[var(--color-text-primary)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-xs)', padding: '4px 8px' }} onClick={this.handleSwitchToText}>
                                {strings.canvas.mindmap.errorSwitchToText}
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
