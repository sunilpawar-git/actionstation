/**
 * Adds JSDoc comments before exported functions/components that are missing them.
 * Run: node scripts/add-jsdoc.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * Inserts a docstring line immediately before the first occurrence of `beforeLine`
 * in the file. Skips if a JSDoc block already precedes that line.
 */
function insertDoc(filePath, beforeLine, doc) {
  const abs = resolve(ROOT, filePath);
  let src = readFileSync(abs, 'utf8');
  const idx = src.indexOf(beforeLine);
  if (idx === -1) {
    console.error(`❌ NOT FOUND: "${beforeLine.slice(0, 60)}" in ${filePath}`);
    return;
  }
  // Find start of the line containing `beforeLine`
  let lineStart = idx;
  while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
  // Check if the line immediately before is already a JSDoc comment
  const before = src.slice(0, lineStart).trimEnd();
  if (before.endsWith('*/')) {
    console.log(`⏭  SKIP (already has JSDoc): ${filePath}`);
    return;
  }
  src = src.slice(0, lineStart) + doc + '\n' + src.slice(lineStart);
  writeFileSync(abs, src);
  console.log(`✅ ${filePath}`);
}

// ─── App components ────────────────────────────────────────────────────────
insertDoc(
  'src/app/components/Layout.tsx',
  'export function Layout(',
  '/** Renders the app shell: pinned/hover sidebar, top header bar, and main canvas area. */'
);
insertDoc(
  'src/app/components/OfflineBanner.tsx',
  'export function OfflineBanner()',
  '/** Dismissible banner shown at the top of the canvas when the network is offline. */'
);
insertDoc(
  'src/app/components/SyncStatusIndicator.tsx',
  'function getIndicatorState(',
  '/** Derives the status dot variant and label from current save/network/sync state. */'
);
insertDoc(
  'src/app/components/SyncStatusIndicator.tsx',
  'export function SyncStatusIndicator()',
  '/** Displays a coloured status dot and label reflecting current save/sync/network state. */'
);

// ─── AI ────────────────────────────────────────────────────────────────────
insertDoc(
  'src/features/ai/components/PoolPreviewBadge.tsx',
  'export const PoolPreviewBadge',
  '/** Amber badge showing the pooled node count; renders nothing when the count is zero. */'
);

// ─── Auth ──────────────────────────────────────────────────────────────────
insertDoc(
  'src/features/auth/components/LoginPage.tsx',
  'function GoogleIcon()',
  '/** Google "G" logo SVG used inside the sign-in button. */'
);
insertDoc(
  'src/features/auth/components/LoginPage.tsx',
  'function LoginLogo()',
  '/** App logo mark displayed at the top of the sign-in card. */'
);
insertDoc(
  'src/features/auth/components/LoginPage.tsx',
  'function LoginError(',
  '/** Inline error alert rendered when sign-in fails. */'
);
insertDoc(
  'src/features/auth/components/LoginPage.tsx',
  'function LoginButton(',
  '/** "Sign in with Google" button with loading-spinner state. */'
);
insertDoc(
  'src/features/auth/components/LoginPage.tsx',
  'export function LoginPage()',
  '/** Full-page Google OAuth sign-in screen. */'
);

// ─── Calendar ──────────────────────────────────────────────────────────────
insertDoc(
  'src/features/calendar/components/CalendarBadge.tsx',
  'function formatBadgeDate(',
  '/** Formats an ISO date string as a short locale date + time (e.g. "Mar 16, 2:30 PM"). */'
);
insertDoc(
  'src/features/calendar/components/CalendarBadge.tsx',
  'export const CalendarBadge',
  '/** Calendar event badge showing type icon, title, date, and sync status on IdeaCard nodes. */'
);

// ─── Canvas nodes ──────────────────────────────────────────────────────────
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  'export class MindmapErrorBoundary',
  '/** React error boundary catching MindmapRenderer failures; shows retry/switch-to-text fallback. */'
);
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  '    static getDerivedStateFromError(): State {',
  '    /** Sets error state to trigger the fallback UI on the next render cycle. */'
);
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  '    componentDidCatch(error: Error): void {',
  '    /** Reports the caught error to Sentry. */'
);
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  '    private handleRetry = () => {',
  '    /** Resets error state so the child tree is re-mounted. */'
);
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  '    private handleSwitchToText = () => {',
  '    /** Resets error state and delegates to the onSwitchToText prop. */'
);
insertDoc(
  'src/features/canvas/components/nodes/MindmapErrorBoundary.tsx',
  '    render() {',
  '    /** Renders fallback UI on error, or children when healthy. */'
);

// ─── Clustering ────────────────────────────────────────────────────────────
insertDoc(
  'src/features/clustering/components/ClusterBoundaries.tsx',
  'function computeBoundsFromNodes(',
  '/** Computes the padded bounding rectangle for a set of cluster nodes, or null if the set is empty. */'
);
insertDoc(
  'src/features/clustering/components/ClusterBoundaries.tsx',
  'export const ClusterBoundaries',
  '/** Renders translucent cluster boundary overlays as a ReactFlow sibling layer. */'
);
insertDoc(
  'src/features/clustering/components/ClusterPreviewBar.tsx',
  'export const ClusterPreviewBar',
  '/** Floating accept/dismiss bar shown at the bottom of the canvas during cluster preview. */'
);

// ─── Knowledge Bank ────────────────────────────────────────────────────────
insertDoc(
  'src/features/knowledgeBank/components/KnowledgeBankPanel.tsx',
  'export function KnowledgeBankPanel()',
  '/** Slide-out panel for browsing, searching, and managing Knowledge Bank entries. */'
);
insertDoc(
  'src/features/knowledgeBank/components/KnowledgeBankPanel.tsx',
  'function PanelHeader(',
  '/** Header row with title and close button for the Knowledge Bank panel. */'
);

// ─── Onboarding ────────────────────────────────────────────────────────────
insertDoc(
  'src/features/onboarding/components/CoachMark.tsx',
  'function computePosition(',
  '/** Computes fixed-position CSS for the coach mark popup relative to the target element and placement. */'
);
insertDoc(
  'src/features/onboarding/components/CoachMark.tsx',
  'function CoachMarkPopup(',
  '/** Inner popup card for a coach mark step; shows title, description, optional try-prompt, and nav buttons. */'
);
insertDoc(
  'src/features/onboarding/components/CoachMark.tsx',
  'export const CoachMark',
  '/** Portal-rendered spotlight coach mark that anchors to a CSS selector and dismisses via Escape. */'
);
insertDoc(
  'src/features/onboarding/components/HelpButton.tsx',
  'export const HelpButton',
  '/** Persistent "?" floating button that opens the ShortcutsPanel; hidden during active onboarding. */'
);
insertDoc(
  'src/features/onboarding/components/ShortcutsPanel.tsx',
  'function ShortcutList()',
  '/** Renders the keyboard shortcut reference list as an accessible <ul>. */'
);
insertDoc(
  'src/features/onboarding/components/ShortcutsPanel.tsx',
  'export const ShortcutsPanel',
  '/** Portal-rendered keyboard shortcuts cheat sheet; dismissed by Escape or the close button. */'
);
insertDoc(
  'src/features/onboarding/components/WelcomeScreen.tsx',
  'function WelcomeBullets()',
  '/** Bullet list highlighting three key features of the app on the welcome screen. */'
);
insertDoc(
  'src/features/onboarding/components/WelcomeScreen.tsx',
  'export const WelcomeScreen',
  '/** Full-screen first-visit welcome overlay; portal-rendered and dismissed by CTA or Escape. */'
);

// ─── Synthesis ─────────────────────────────────────────────────────────────
insertDoc(
  'src/features/synthesis/components/SelectionToolbar.tsx',
  'export const SelectionToolbar',
  '/** Floating toolbar shown when 2+ canvas nodes are selected; provides synthesis and export actions. */'
);
insertDoc(
  'src/features/synthesis/components/SynthesisFooter.tsx',
  'export const SynthesisFooter',
  '/** Footer bar on synthesis nodes showing source count, highlight-sources action, and re-synthesize button. */'
);
insertDoc(
  'src/features/synthesis/components/SynthesisModePopover.tsx',
  'export const SynthesisModePopover',
  '/** Keyboard-navigable popover for selecting one of the four synthesis modes. */'
);

// ─── Tags ──────────────────────────────────────────────────────────────────
insertDoc(
  'src/features/tags/components/TagInput.tsx',
  'export function TagInput(',
  '/** Add/remove tags on a canvas node with inline autocomplete and on-the-fly tag creation. */'
);

// ─── Workspace ─────────────────────────────────────────────────────────────
insertDoc(
  'src/features/workspace/components/PinWorkspaceButton.tsx',
  'export const PinWorkspaceButton',
  '/** Toggle button to pin a workspace for offline availability; shows upgrade prompt for free users. */'
);

// ─── Shared components ─────────────────────────────────────────────────────
insertDoc(
  'src/shared/components/ConfirmDialog.tsx',
  'export function ConfirmDialog()',
  '/** Global async-compatible confirmation modal; themed replacement for window.confirm. */'
);
insertDoc(
  'src/shared/components/ErrorBoundary.tsx',
  'export class ErrorBoundary',
  '/** React class error boundary providing a retry-able fallback UI for unexpected render errors. */'
);
insertDoc(
  'src/shared/components/ErrorBoundary.tsx',
  '    static getDerivedStateFromError(',
  '    /** Captures the thrown error in state, triggering the fallback UI on the next render. */'
);
insertDoc(
  'src/shared/components/ErrorBoundary.tsx',
  '    componentDidCatch(',
  '    /** Logs the error and component stack to the monitoring service. */'
);
insertDoc(
  'src/shared/components/ErrorBoundary.tsx',
  '    handleRetry = () => {',
  '    /** Resets error state to unmount the fallback and re-render children. */'
);
insertDoc(
  'src/shared/components/ErrorBoundary.tsx',
  '    render() {',
  '    /** Renders fallback UI with a retry button on error, or children when healthy. */'
);
insertDoc(
  'src/shared/components/LoadingFallback.tsx',
  'export function LoadingFallback(',
  '/** Suspense boundary fallback showing a spinner and message; supports optional full-screen overlay. */'
);
insertDoc(
  'src/shared/components/MarkdownRenderer.tsx',
  'export const MarkdownRenderer',
  '/** Renders markdown as safe formatted HTML using react-markdown (XSS-safe by design). */'
);
insertDoc(
  'src/shared/components/OfflineFallback.tsx',
  'export function OfflineFallback(',
  '/** Full-page offline fallback that probes IDB and SW Cache API to show contextual messaging. */'
);
insertDoc(
  'src/shared/components/PortalTooltip/PortalTooltip.tsx',
  'export function PortalTooltip(',
  '/** Portal tooltip anchored to a ref; escapes parent stacking contexts and supports keyboard shortcut hints. */'
);
insertDoc(
  'src/shared/components/SegmentedControl/SegmentedControl.tsx',
  'function SegmentedControlInner<',
  '/** Accessible horizontal radio pill group; each option uses a visually hidden radio for native semantics. */'
);
insertDoc(
  'src/shared/components/SwUpdatePrompt.tsx',
  'export function SwUpdatePrompt(',
  '/** PWA update notification banner; renders nothing when no service-worker update is pending. */'
);
insertDoc(
  'src/shared/components/Toast.tsx',
  'export function ToastContainer()',
  '/** Renders the stack of active toast notifications anchored to the bottom-centre of the viewport. */'
);
insertDoc(
  'src/shared/components/Toggle/Toggle.tsx',
  'export const Toggle',
  '/** Accessible pill-style toggle switch with optional description; uses a visually-hidden checkbox with role="switch". */'
);
insertDoc(
  'src/shared/components/UpgradePrompt.tsx',
  'export function UpgradePrompt(',
  '/** Modal prompt shown to free users when they attempt to access a subscription-gated feature. */'
);

// ─── Localization ──────────────────────────────────────────────────────────
insertDoc(
  'src/shared/localization/authStrings.ts',
  'export const authStrings',
  '/** Localized string constants for all authentication-related UI copy. */'
);

console.log('\nDone.');
