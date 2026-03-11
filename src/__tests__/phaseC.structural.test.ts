/**
 * Phase C structural tests:
 * Function and component line-count limits.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');

function countFunctionLines(src: string, funcName: string): number {
    const pattern = new RegExp(`^export function ${funcName}\\b`, 'm');
    const match = pattern.exec(src);
    if (!match) return -1;
    const start = match.index;
    let braces = 0;
    let started = false;
    let end = start;
    for (let i = start; i < src.length; i++) {
        if (src[i] === '{') { braces++; started = true; }
        if (src[i] === '}') { braces--; }
        if (started && braces === 0) { end = i; break; }
    }
    const body = src.slice(start, end + 1);
    return body.split('\n').length;
}

function countComponentLines(src: string, funcName: string): number {
    const pattern = new RegExp(`^function ${funcName}\\b`, 'm');
    const match = pattern.exec(src);
    if (!match) return -1;
    const start = match.index;
    let braces = 0;
    let started = false;
    let end = start;
    for (let i = start; i < src.length; i++) {
        if (src[i] === '{') { braces++; started = true; }
        if (src[i] === '}') { braces--; }
        if (started && braces === 0) { end = i; break; }
    }
    const body = src.slice(start, end + 1);
    return body.split('\n').length;
}

describe('function/component line limits', () => {
    const actionsFile = readFileSync(
        join(SRC, 'features/canvas/stores/canvasStoreActions.ts'), 'utf-8',
    );
    const canvasView = readFileSync(
        join(SRC, 'features/canvas/components/CanvasView.tsx'), 'utf-8',
    );

    it('createNodeMutationActions is at most 50 lines', () => {
        const lines = countFunctionLines(actionsFile, 'createNodeMutationActions');
        expect(lines).toBeGreaterThan(0);
        expect(lines).toBeLessThanOrEqual(50);
    });

    it('createNodeDataActions is at most 50 lines', () => {
        const lines = countFunctionLines(actionsFile, 'createNodeDataActions');
        expect(lines).toBeGreaterThan(0);
        expect(lines).toBeLessThanOrEqual(50);
    });

    it('CanvasViewInner is at most 100 lines', () => {
        const lines = countComponentLines(canvasView, 'CanvasViewInner');
        expect(lines).toBeGreaterThan(0);
        expect(lines).toBeLessThanOrEqual(100);
    });
});
