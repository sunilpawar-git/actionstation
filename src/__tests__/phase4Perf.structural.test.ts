/**
 * Phase 4 structural tests — deferred fingerprint in loading path
 * and PortalTooltip layout measurement.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');
const AUTOSAVE = readFileSync(join(SRC, 'features/workspace/hooks/useAutosave.ts'), 'utf-8');
const TOOLTIP = readFileSync(join(SRC, 'shared/components/PortalTooltip/PortalTooltip.tsx'), 'utf-8');

describe('Phase 4 — deferred fingerprint + layout measurement', () => {
    it('useAutosave does NOT call buildFingerprint synchronously in the isWorkspaceLoading path', () => {
        const lines = AUTOSAVE.split('\n');
        let inLoadingBlock = false;
        let insideTimeout = false;
        let syncFingerprintInLoading = false;

        for (const line of lines) {
            if (line.includes('if (isWorkspaceLoading)')) inLoadingBlock = true;
            if (inLoadingBlock && line.includes('setTimeout(')) insideTimeout = true;
            if (inLoadingBlock && !insideTimeout && line.includes('buildFingerprint(')) {
                syncFingerprintInLoading = true;
            }
            if (inLoadingBlock && line.trim().startsWith('return')) break;
        }
        expect(syncFingerprintInLoading).toBe(false);
    });

    it('PortalTooltip does NOT call getBoundingClientRect in the render body', () => {
        const funcBody = TOOLTIP.slice(
            TOOLTIP.indexOf('export function PortalTooltip'),
        );
        const hasRenderBcr = /^\s+.*getBoundingClientRect/m.test(funcBody);
        const hasLayoutEffect = TOOLTIP.includes('useLayoutEffect');
        expect(hasRenderBcr && !hasLayoutEffect).toBe(false);
    });

    it('PortalTooltip uses useLayoutEffect for measurement', () => {
        expect(TOOLTIP).toContain('useLayoutEffect');
    });
});
