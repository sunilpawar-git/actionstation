/**
 * Structural test: Reader module compliance.
 * Verifies: no hardcoded strings, no hardcoded colors,
 * Zustand selector discipline, safe URL enforcement.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const READER_DIR = join(__dirname, '..');
const SRC_DIR = join(__dirname, '..', '..', '..');

function getReaderFiles(dir: string, ext = '.tsx'): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('__')) {
            results.push(...getReaderFiles(fullPath, ext));
        } else if (entry.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

function rel(file: string): string {
    return relative(SRC_DIR, file);
}

describe('Reader structural compliance', () => {
    const tsxFiles = getReaderFiles(READER_DIR, '.tsx');
    const tsFiles = [
        ...getReaderFiles(READER_DIR, '.ts'),
        ...tsxFiles,
    ].filter((f) => !f.includes('__tests__'));

    it('should have reader component files to test', () => {
        expect(tsxFiles.length).toBeGreaterThanOrEqual(5);
    });

    it('components do not contain hardcoded user-facing strings in JSX', () => {
        const violations: string[] = [];
        const hardcodedPattern = />\s*[A-Z][a-z]+(?:\s+[a-z]+){1,}\s*</;
        for (const file of tsxFiles) {
            const content = readFileSync(file, 'utf-8');
            if (content.includes('strings.') || content.includes('strings[')) continue;
            if (hardcodedPattern.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });

    it('components do not use hardcoded hex colors', () => {
        const violations: string[] = [];
        const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
        for (const file of tsxFiles) {
            const content = readFileSync(file, 'utf-8');
            if (hexPattern.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });

    it('stores use selector pattern (no bare destructuring)', () => {
        const violations: string[] = [];
        const barePattern = /const\s*\{[^}]+\}\s*=\s*use(?:Focus|Canvas|Reader|Workspace)Store\(\)/;
        for (const file of tsFiles) {
            const content = readFileSync(file, 'utf-8');
            if (barePattern.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });

    it('reader opens only through safe URL utilities (no raw URL assignment to readerContext)', () => {
        const violations: string[] = [];
        const unsafePattern = /readerContext\s*[:=]\s*\{[^}]*url:\s*(?!source\.url)/;
        for (const file of tsFiles) {
            const content = readFileSync(file, 'utf-8');
            if (unsafePattern.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });

    it('all reader components import strings from localization', () => {
        const violations: string[] = [];
        for (const file of tsxFiles) {
            const content = readFileSync(file, 'utf-8');
            if (!content.includes("from '@/shared/localization/strings'") &&
                !content.includes("from '../strings/readerStrings'")) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });

    it('analytics events never include raw URL or quote text', () => {
        const violations: string[] = [];
        const sensitivePattern = /track(?:Reader|reader)\w*\([^)]*(?:\.url|\.text|selectedText|selectionDraft)/;
        for (const file of tsFiles) {
            const content = readFileSync(file, 'utf-8');
            if (sensitivePattern.test(content)) {
                violations.push(rel(file));
            }
        }
        expect(violations).toEqual([]);
    });
});
