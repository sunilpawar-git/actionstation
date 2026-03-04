/**
 * Structural test: Gemini API key isolation
 *
 * Prevents regression of S1 (client-side API key exposure) by ensuring:
 * 1. Only geminiClient.ts (the SSOT) may reference VITE_GEMINI_API_KEY
 * 2. No source file constructs a direct Gemini API URL
 * 3. All AI services use callGemini() from geminiClient, not raw fetch
 * 4. geminiClient.ts itself prefers the proxy path over the direct key
 *
 * If this test fails, you are introducing a direct Gemini API dependency
 * that bypasses the Cloud Function proxy — a security violation.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

/** The ONLY file allowed to reference the direct API key */
const SSOT_FILE = 'features/knowledgeBank/services/geminiClient.ts';

/** Test setup file is also allowed to stub env vars */
const TEST_SETUP_FILE = 'test/setup.ts';

/** Type declaration file declares all env vars */
const ENV_DECLARATION_FILE = 'vite-env.d.ts';

/** Collect all .ts/.tsx source files (excluding node_modules, __tests__, dist) */
function getSourceFiles(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'dist', '__tests__'].includes(entry.name)) continue;
            getSourceFiles(full, results);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
            results.push(full);
        }
    }
    return results;
}

/** Read a file and return its content */
function read(filePath: string): string {
    return readFileSync(filePath, 'utf-8');
}

/** Get relative path from src/ for readable error messages */
function rel(filePath: string): string {
    return relative(SRC_DIR, filePath);
}

describe('Gemini API Key Isolation (S1 prevention)', () => {
    const sourceFiles = getSourceFiles(SRC_DIR);

    it('should scan a meaningful number of source files', () => {
        expect(sourceFiles.length).toBeGreaterThan(50);
    });

    it('only geminiClient.ts may reference VITE_GEMINI_API_KEY', () => {
        const violations: string[] = [];

        for (const file of sourceFiles) {
            const relPath = rel(file);
            if (relPath === SSOT_FILE || relPath === TEST_SETUP_FILE || relPath === ENV_DECLARATION_FILE) continue;

            const content = read(file);
            if (content.includes('VITE_GEMINI_API_KEY')) {
                violations.push(relPath);
            }
        }

        expect(
            violations,
            `These files reference VITE_GEMINI_API_KEY directly. Use callGemini() from geminiClient.ts instead:\n${violations.map((v) => `  - ${v}`).join('\n')}`
        ).toEqual([]);
    });

    it('no source file constructs a direct Gemini API URL', () => {
        const violations: string[] = [];

        for (const file of sourceFiles) {
            const relPath = rel(file);
            if (relPath === SSOT_FILE) continue; // SSOT has the dev fallback

            const content = read(file);
            if (content.includes('generativelanguage.googleapis.com')) {
                violations.push(relPath);
            }
        }

        expect(
            violations,
            `These files construct a direct Gemini API URL. All Gemini calls must go through geminiClient.ts:\n${violations.map((v) => `  - ${v}`).join('\n')}`
        ).toEqual([]);
    });

    it('AI service files use callGemini, not raw fetch to Gemini', () => {
        const aiServiceFiles = sourceFiles.filter((f) => {
            const r = rel(f);
            return (r.startsWith('features/ai/services/') ||
                    r.startsWith('features/knowledgeBank/services/')) &&
                   r !== SSOT_FILE;
        });

        const violations: string[] = [];
        for (const file of aiServiceFiles) {
            const content = read(file);
            // If file imports callGemini or doesn't call fetch at all → OK
            // If file calls fetch AND doesn't import callGemini → violation
            const callsFetch = /\bfetch\s*\(/.test(content);
            const importsCallGemini = content.includes('callGemini');
            const isGeminiRelated = content.includes('gemini') || content.includes('Gemini') || /summariz|describ.*image/i.test(content);

            if (callsFetch && isGeminiRelated && !importsCallGemini) {
                violations.push(rel(file));
            }
        }

        expect(
            violations,
            `These AI service files call fetch() directly for Gemini-related operations. Use callGemini() from geminiClient.ts instead:\n${violations.map((v) => `  - ${v}`).join('\n')}`
        ).toEqual([]);
    });

    it('geminiClient.ts checks proxy before direct key in callGemini', () => {
        const ssotPath = join(SRC_DIR, SSOT_FILE);
        const content = read(ssotPath);

        // Extract the callGemini function body to verify ordering
        const fnStart = content.indexOf('async function callGemini(');
        expect(fnStart).toBeGreaterThan(-1);

        const fnBody = content.slice(fnStart);
        const proxyIndex = fnBody.indexOf('isProxyConfigured()');
        const directIndex = fnBody.indexOf('getDirectApiKey()');

        expect(proxyIndex).toBeGreaterThan(-1);
        expect(directIndex).toBeGreaterThan(-1);
        expect(
            proxyIndex < directIndex,
            'callGemini() must check isProxyConfigured() BEFORE getDirectApiKey(). ' +
            'The Cloud Function proxy is the secure production path.'
        ).toBe(true);
    });

    it('geminiClient.ts proxy path includes auth headers', () => {
        const ssotPath = join(SRC_DIR, SSOT_FILE);
        const content = read(ssotPath);

        expect(content).toContain('Authorization');
        expect(content).toContain('Bearer');
        expect(content).toContain('getAuthToken');
    });
});
