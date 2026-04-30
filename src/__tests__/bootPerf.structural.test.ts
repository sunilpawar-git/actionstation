/**
 * Structural tests: Boot performance regressions.
 *
 * Guards the four fixes made to speed up cold-start:
 *  1. Sentry must never be statically imported into the main bundle
 *  2. bundleLoader must use a Promise.race timeout (prevent cold-CF hang)
 *  3. useWorkspaceLoading must hydrate IDB and fetch workspaces in parallel
 *  4. workspace preload must not load ALL workspaces on boot
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Sentry static import guard
// ---------------------------------------------------------------------------

describe('Sentry must not be statically imported (boot perf)', () => {
    it('sentryService.ts uses dynamic import(), not static import * from @sentry/react', () => {
        const file = path.join(SRC_DIR, 'shared/services/sentryService.ts');
        const content = fs.readFileSync(file, 'utf-8');

        // Static top-level import of @sentry/react would pull the entire SDK
        // (~150 KB gzip) into the main bundle and block first paint.
        const staticImport = /^import\s+(?:\*\s+as\s+\w+|\{[^}]+\}|\w+)\s+from\s+['"]@sentry\/react['"]/m;
        expect(
            staticImport.test(content),
            'sentryService.ts must not have a static top-level import from @sentry/react. ' +
            'Use dynamic import() inside initSentry() so the SDK is deferred to a separate chunk.'
        ).toBe(false);

        // Must have a dynamic import somewhere in the file
        const dynamicImport = /import\(['"]@sentry\/react['"]\)/;
        expect(
            dynamicImport.test(content),
            'sentryService.ts must use dynamic import("@sentry/react") to keep Sentry out of the main bundle.'
        ).toBe(true);
    });

    it('main.tsx defers initSentry() — does not call it synchronously before createRoot', () => {
        const file = path.join(SRC_DIR, 'main.tsx');
        const content = fs.readFileSync(file, 'utf-8');

        // initSentry() must NOT appear before the scheduleIdle / requestIdleCallback call.
        // A synchronous call would block render.
        const lines = content.split('\n');
        const idleIdx = lines.findIndex(l => /scheduleIdle|requestIdleCallback/.test(l));
        const syncCallIdx = lines.findIndex(l => /initSentry\s*\(\s*\)/.test(l) && !/scheduleIdle|void\s+initSentry/.test(l));

        // There must be no bare synchronous initSentry() call before createRoot
        const createRootIdx = lines.findIndex(l => /createRoot\s*\(/.test(l));
        const bareSyncCallBeforeRender = lines.slice(0, createRootIdx).some(
            l => /^\s*initSentry\s*\(\s*\)\s*;/.test(l)
        );
        expect(
            bareSyncCallBeforeRender,
            'main.tsx must not call initSentry() synchronously before createRoot(). ' +
            'Defer it via scheduleIdle/requestIdleCallback so it does not block first paint.'
        ).toBe(false);

        // scheduleIdle must appear in the file
        expect(idleIdx).toBeGreaterThan(-1);

        // initSentry must be deferred (called inside scheduleIdle or as void async)
        const deferredCall = /scheduleIdle\s*\(\s*\(\s*\)\s*=>\s*\{\s*void\s+initSentry|scheduleIdle\s*\(\s*\(\s*\)\s*=>\s*\{\s*void initSentry/;
        expect(
            deferredCall.test(content),
            'main.tsx must defer initSentry() inside scheduleIdle(() => { void initSentry(); })'
        ).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 2. bundleLoader timeout guard
// ---------------------------------------------------------------------------

describe('bundleLoader must have a timeout to prevent cold-CF boot hang', () => {
    it('loadWorkspaceBundle uses Promise.race with a timeout', () => {
        const file = path.join(SRC_DIR, 'features/workspace/services/bundleLoader.ts');
        const content = fs.readFileSync(file, 'utf-8');

        expect(
            content.includes('Promise.race'),
            'bundleLoader.ts: loadWorkspaceBundle() must use Promise.race to timeout the ' +
            'workspaceBundle Cloud Function call. Without this, a cold function start hangs ' +
            'the workspace list for up to 10 s.'
        ).toBe(true);

        // Must have a setTimeout-based rejection inside the race
        expect(
            /setTimeout\s*\(/.test(content),
            'bundleLoader.ts: the Promise.race timeout must use setTimeout to create a rejection.'
        ).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 3. Parallel IDB hydration + workspace fetch
// ---------------------------------------------------------------------------

describe('useWorkspaceLoading must hydrate IDB in parallel with workspace fetch', () => {
    it('uses Promise.all for hydrateFromIdb and loadUserWorkspaces', () => {
        const file = path.join(SRC_DIR, 'app/hooks/useWorkspaceLoading.ts');
        const content = fs.readFileSync(file, 'utf-8');

        // Serial: await hydrateFromIdb() followed by await loadUserWorkspaces()
        // would add ~50-150ms to every cold load. Must use Promise.all instead.
        const serialPattern = /await\s+workspaceCache\.hydrateFromIdb\s*\(\s*\)[\s\S]{0,200}?const\s+loaded\s*=\s*await\s+loadUserWorkspaces/;
        expect(
            serialPattern.test(content),
            'useWorkspaceLoading.ts: hydrateFromIdb() and loadUserWorkspaces() must run ' +
            'in parallel with Promise.all, not serially with two separate awaits.'
        ).toBe(false);

        expect(
            content.includes('Promise.all'),
            'useWorkspaceLoading.ts: must use Promise.all([ hydrateFromIdb(), loadUserWorkspaces() ]) ' +
            'to parallelize the two independent operations.'
        ).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 4. Preload scope guard — only active workspace, not all workspaces
// ---------------------------------------------------------------------------

describe('workspace preload must not load all workspaces on boot', () => {
    it('does not call preload with loaded.map(ws => ws.id)', () => {
        const file = path.join(SRC_DIR, 'app/hooks/useWorkspaceLoading.ts');
        const content = fs.readFileSync(file, 'utf-8');

        // This pattern fired N×2 Firestore reads on boot, competing with the active workspace load.
        const allWorkspacesPreload = /preload\s*\(\s*uid\s*,\s*loaded\.map\s*\(\s*ws\s*=>\s*ws\.id\s*\)\s*\)/;
        expect(
            allWorkspacesPreload.test(content),
            'useWorkspaceLoading.ts: preload() must not receive loaded.map(ws => ws.id). ' +
            'Only the active workspace should be preloaded on boot — other workspaces load on-demand.'
        ).toBe(false);
    });
});
