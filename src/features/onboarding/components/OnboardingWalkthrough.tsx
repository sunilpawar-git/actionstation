/**
 * OnboardingWalkthrough — orchestrates the two-stage first-run experience.
 * Stage 1: WelcomeScreen. Stage 2: 3-step CoachMark walkthrough.
 * Demo nodes are seeded after welcome dismissal; step 3 auto-selects them.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import {
    trackOnboardingWelcomeShown, trackOnboardingWelcomeDismissed,
    trackOnboardingStepViewed, trackOnboardingCompleted, trackOnboardingSkipped,
} from '@/shared/services/analyticsService';
import { useOnboarding } from '../hooks/useOnboarding';
import { WelcomeScreen } from './WelcomeScreen';
import { CoachMark } from './CoachMark';
import { HelpButton } from './HelpButton';
import { seedDemoNodes } from '../utils/seedDemoNodes';
import { DEMO_NODE_1_ID, DEMO_NODE_2_ID } from '../types/onboarding';
import { useOnboardingSignalStore } from '../stores/onboardingSignalStore';
import type { CoachMarkConfig } from '../types/onboarding';

// Defined outside component — stable reference, strings are const
const COACH_MARKS: CoachMarkConfig[] = [
    {
        step:           'createNode',
        targetSelector: '[data-testid="add-node-button"]',
        placement:      'right',
        tryPrompt:      strings.onboarding.createNode.tryPrompt,
    },
    {
        step:           'connectNodes',
        targetSelector: `[data-id="${DEMO_NODE_1_ID}"]`,
        placement:      'bottom',
        tryPrompt:      strings.onboarding.connectNodes.tryPrompt,
    },
    {
        step:           'synthesize',
        targetSelector: '[data-testid="selection-toolbar"]',
        placement:      'top',
        tryPrompt:      strings.onboarding.synthesize.tryPrompt,
    },
];

export function OnboardingWalkthrough() {
    const { showWelcome, activeStep, stepIndex, totalSteps,
            start, dismissWelcome, next, skip, replay } = useOnboarding();

    const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const startedRef  = useRef(false);
    const seededRef   = useRef(false);

    // Fire start() when workspace is ready (once, StrictMode-safe)
    useEffect(() => {
        if (!workspaceId || startedRef.current) return;
        startedRef.current = true;
        if (showWelcome) trackOnboardingWelcomeShown();
        start();
    }, [workspaceId, showWelcome, start]);

    // Seed demo nodes once when welcome is dismissed
    useEffect(() => {
        const ws = workspaceId;
        if (showWelcome || seededRef.current || !ws) return;
        seededRef.current = true;
        seedDemoNodes(ws);
        trackOnboardingWelcomeDismissed();
    }, [showWelcome, workspaceId]);

    // Track each step as it becomes active
    useEffect(() => {
        if (activeStep !== null && stepIndex !== null) {
            trackOnboardingStepViewed(activeStep, stepIndex);
        }
    }, [activeStep, stepIndex]);

    // Auto-select both demo nodes at step 3 so SelectionToolbar renders
    useEffect(() => {
        if (stepIndex !== 2) return;
        useCanvasStore.getState().selectNode(DEMO_NODE_1_ID);
        useCanvasStore.getState().selectNode(DEMO_NODE_2_ID);
        return () => { useCanvasStore.getState().clearSelection(); };
    }, [stepIndex]);

    // handleReplay resets seeding so demo nodes are re-created on replay if deleted
    const handleReplay = useCallback(() => {
        seededRef.current = false;
        replay();
    }, [replay]);

    // Bridge Zustand signal → replay() (fired by AboutSection "Replay walkthrough")
    const replayRequestCount = useOnboardingSignalStore((s) => s.replayRequestCount);
    useEffect(() => {
        if (replayRequestCount > 0) handleReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to counter bumps, not handleReplay identity
    }, [replayRequestCount]);

    const handleNext = useCallback(() => {
        if (stepIndex === totalSteps - 1) trackOnboardingCompleted(totalSteps);
        next();
    }, [next, stepIndex, totalSteps]);

    const handleSkip = useCallback(() => {
        trackOnboardingSkipped(stepIndex ?? 0);
        skip();
    }, [skip, stepIndex]);

    if (showWelcome) return <WelcomeScreen onDismiss={dismissWelcome} />;

    // Rendered on every non-welcome state; hidden by HelpButton when isOnboardingActive=true
    const helpButton = <HelpButton isOnboardingActive={activeStep !== null} onReplay={handleReplay} />;

    // TypeScript narrowing — activeStep and stepIndex are always in sync
    if (activeStep == null) return helpButton;
    if (stepIndex === null) return helpButton;

    const config    = COACH_MARKS.find((c) => c.step === activeStep);
    if (!config) return helpButton;
    const stepLabel = strings.onboarding.stepLabel(stepIndex + 1, totalSteps);
    const isLast    = stepIndex === totalSteps - 1;
    const stepStrings = {
        createNode:   strings.onboarding.createNode,
        connectNodes: strings.onboarding.connectNodes,
        synthesize:   strings.onboarding.synthesize,
    };

    return (
        <>
            <CoachMark
                targetSelector={config.targetSelector}
                title={stepStrings[activeStep].title}
                description={stepStrings[activeStep].description}
                tryPrompt={config.tryPrompt}
                placement={config.placement}
                stepLabel={stepLabel}
                onNext={handleNext}
                onSkip={handleSkip}
                nextLabel={isLast ? strings.onboarding.doneLabel : strings.onboarding.nextLabel}
                skipLabel={strings.onboarding.skipLabel}
            />
            {helpButton}
        </>
    );
}
