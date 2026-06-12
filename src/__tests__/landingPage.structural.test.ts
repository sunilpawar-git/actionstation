/**
 * Landing Page — Structural tests
 * Enforces architectural constraints on the landing feature module.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const LANDING_DIR = path.resolve(__dirname, '../features/landing');

function getFilesRecursive(dir: string, ext: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getFilesRecursive(full, ext));
        } else if (entry.name.endsWith(ext) && !entry.name.includes('.test.')) {
            results.push(full);
        }
    }
    return results;
}

describe('landingPage structural', () => {
    const tsxFiles = getFilesRecursive(
        path.join(LANDING_DIR, 'components'),
        '.tsx',
    );

    it('all .tsx component files are under 100 lines', () => {
        const overSize: string[] = [];
        for (const file of tsxFiles) {
            const lines = fs.readFileSync(file, 'utf-8').split('\n').length;
            if (lines > 100) {
                overSize.push(`${path.basename(file)}: ${lines} lines (max 100)`);
            }
        }
        expect(overSize, `Components over 100 lines:\n${overSize.join('\n')}`).toEqual([]);
    });

    it('no Zustand store imports in landing feature', () => {
        const allFiles = [
            ...getFilesRecursive(path.join(LANDING_DIR, 'components'), '.tsx'),
            ...getFilesRecursive(path.join(LANDING_DIR, 'hooks'), '.ts'),
        ];
        const violations: string[] = [];
        for (const file of allFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            // Allow importing types/constants from subscription (SSOT tier limits)
            if (/from ['"].*stores\//.test(content) || content.includes('useStore') || content.includes('zustand')) {
                violations.push(path.basename(file));
            }
        }
        expect(
            violations,
            `Zustand imports found in landing feature:\n${violations.join('\n')}`,
        ).toEqual([]);
    });

    it('no console.* usage in landing feature', () => {
        const allFiles = [
            ...getFilesRecursive(path.join(LANDING_DIR, 'components'), '.tsx'),
            ...getFilesRecursive(path.join(LANDING_DIR, 'hooks'), '.ts'),
            ...getFilesRecursive(path.join(LANDING_DIR, 'strings'), '.ts'),
        ];
        const violations: string[] = [];
        for (const file of allFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (/console\.(log|warn|error|info|debug)\(/.test(content)) {
                violations.push(path.basename(file));
            }
        }
        expect(violations, `console.* found:\n${violations.join('\n')}`).toEqual([]);
    });

    it('landingStrings.ts exists and is imported by strings.ts', () => {
        const stringsHub = fs.readFileSync(
            path.resolve(__dirname, '../shared/localization/strings.ts'),
            'utf-8',
        );
        expect(stringsHub).toContain('landingStrings');

        const landingStringsPath = path.join(LANDING_DIR, 'strings', 'landingStrings.ts');
        expect(fs.existsSync(landingStringsPath)).toBe(true);
    });

    it('PricingSection imports from tierLimits (SSOT)', () => {
        const pricingFile = path.join(LANDING_DIR, 'components', 'PricingSection.tsx');
        const content = fs.readFileSync(pricingFile, 'utf-8');
        expect(content).toContain('tierLimits');
    });
});
