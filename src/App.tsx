/**
 * App Entry Point
 * Uses React.lazy for code splitting of non-critical components
 */
import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { subscribeToAuthState } from '@/features/auth/services/authService';
import { Layout } from '@/app/components/Layout';
import { CanvasView } from '@/features/canvas/components/CanvasView';
import { KeyboardShortcutsProvider } from '@/features/canvas/components/KeyboardShortcutsProvider';
import { SearchInputRefProvider } from '@/features/search/context/SearchInputRefContext';
import { ToastContainer } from '@/shared/components/Toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { SwUpdatePrompt } from '@/shared/components/SwUpdatePrompt';
import { OfflineFallback } from '@/shared/components/OfflineFallback';
import { useThemeApplicator } from '@/shared/hooks/useThemeApplicator';
import { useCompactMode } from '@/shared/hooks/useCompactMode';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useQueueDrainer } from '@/app/hooks/useQueueDrainer';
import { useSwRegistration } from '@/shared/hooks/useSwRegistration';
import { useAutosave } from '@/features/workspace/hooks/useAutosave';
import { useWorkspaceLoader } from '@/features/workspace/hooks/useWorkspaceLoader';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { WorkspaceContext } from '@/app/contexts/WorkspaceContext';
import { usePinnedWorkspaceStore } from '@/features/workspace/stores/pinnedWorkspaceStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { strings } from '@/shared/localization/strings';
import { OnboardingWalkthrough } from '@/features/onboarding';
import { CalendarCallback } from '@/features/auth/components/CalendarCallback';
import '@/styles/global.css';

// Lazy load non-critical components for better initial load performance
const LoginPage = lazy(() =>
    import('@/features/auth/components/LoginPage').then(m => ({ default: m.LoginPage }))
);
const SettingsPanel = lazy(() =>
    import('@/app/components/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

function AuthenticatedApp() {
    const userId = useAuthStore((s) => s.user?.id);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const isSwitching = useWorkspaceStore((s) => s.isSwitching);
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const {
        isLoading: initialLoading,
        error: loadError,
        hasOfflineData,
    } = useWorkspaceLoader(currentWorkspaceId ?? '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useThemeApplicator();
    useCompactMode();
    useNetworkStatus();
    useQueueDrainer();
    useAutosave(currentWorkspaceId ?? '', initialLoading);

    useEffect(() => {
        if (userId) {
            void usePinnedWorkspaceStore.getState().loadPinnedIds();
            void useSubscriptionStore.getState().loadSubscription(userId);
        }
    }, [userId]);

    const openSettings = useCallback(() => setIsSettingsOpen(true), []);
    const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
    const wsCtx = useMemo(() => ({ currentWorkspaceId, isSwitching }), [currentWorkspaceId, isSwitching]);

    if (!isOnline && loadError && !hasOfflineData) {
        return (
            <OfflineFallback
                hasOfflineData={false}
                onRetry={() => window.location.reload()}
            />
        );
    }
    return (
        <WorkspaceContext.Provider value={wsCtx}>
            <ReactFlowProvider>
                <SearchInputRefProvider>
                    <KeyboardShortcutsProvider onOpenSettings={openSettings} />
                    <Layout onSettingsClick={openSettings}>
                    <CanvasView />
                    {initialLoading && (
                        <div className="canvas-loading-overlay">
                            <div className="loading-spinner" />
                            <p>{strings.common.loading}</p>
                        </div>
                    )}
                    </Layout>
                </SearchInputRefProvider>
                <Suspense fallback={null}>
                    <SettingsPanel isOpen={isSettingsOpen} onClose={closeSettings} />
                </Suspense>
                <OnboardingWalkthrough />
            </ReactFlowProvider>
        </WorkspaceContext.Provider>
    );
}

function AppContent() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const authLoading = useAuthStore((s) => s.isLoading);

    // Google Calendar OAuth callback — handle before any auth/workspace checks
    if (window.location.pathname === '/auth/calendar/callback') {
        return <CalendarCallback />;
    }

    // Auth loading state
    if (authLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>{strings.common.loading}</p>
            </div>
        );
    }

    // Not authenticated - lazy load login page
    if (!isAuthenticated) {
        return (
            <Suspense fallback={<LoadingFallback fullScreen />}>
                <LoginPage />
            </Suspense>
        );
    }

    // Authenticated - show app with workspace loading
    return <AuthenticatedApp />;
}

export function App() {
    const swRegistration = useSwRegistration();

    useEffect(() => {
        const unsubscribe = subscribeToAuthState();
        return unsubscribe;
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <AppContent />
                <ToastContainer />
                <ConfirmDialog />
                <SwUpdatePrompt registration={swRegistration} />
            </ErrorBoundary>
        </QueryClientProvider>
    );
}

export default App;
