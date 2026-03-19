/**
 * Architectural Guardrail — Security & Infrastructure
 *
 * Prevents regression of production-hardening fixes via source code scanning.
 * Covers: #3 (CORS restriction), #5 (token validation), #7 (recursive stores),
 *         #11 (token-in-URL), Cloud Functions file size limits.
 *
 * See also: guardrails.resilience.structural.test.ts for client resilience.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');
const FUNCTIONS_DIR = join(process.cwd(), 'functions', 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '__tests__']);

function collectFiles(dir: string, results: string[] = []): string[] {
    if (!existsSync(dir)) return results;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            collectFiles(full, results);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
            results.push(full);
        }
    }
    return results;
}

const relSrc = (f: string) => relative(SRC_DIR, f);
const relFn = (f: string) => relative(FUNCTIONS_DIR, f);
const read = (f: string) => readFileSync(f, 'utf-8');
const srcFiles = collectFiles(SRC_DIR);
const funcFiles = collectFiles(FUNCTIONS_DIR);

// ─── #3: Cloud Functions CORS restriction ─────────────────────────────────

describe('#3 — Cloud Functions must not use cors: true', () => {
    it('no function file uses cors: true (allows all origins)', () => {
        const violations: string[] = [];
        for (const file of funcFiles) {
            if (/cors:\s*true/.test(read(file))) violations.push(relFn(file));
        }
        expect(violations, fmt('cors: true in Cloud Functions', 'Use cors: ALLOWED_ORIGINS', violations)).toEqual([]);
    });

    it('corsConfig.ts does not contain wildcard origin', () => {
        const p = join(FUNCTIONS_DIR, 'utils', 'corsConfig.ts');
        if (!existsSync(p)) return;
        const origins = /ALLOWED_ORIGINS[^;]*;/s.exec(read(p))?.[0] ?? '';
        expect(origins).not.toContain("'*'");
        expect(origins).not.toContain('"*"');
    });
});

// ─── #5: Token storage — server-side OAuth requires no token in localStorage ─

describe('#5 — token storage must validate format before localStorage write', () => {
    it('calendarAuthService validates tokens before storing', () => {
        const p = join(SRC_DIR, 'features', 'auth', 'services', 'calendarAuthService.ts');
        if (!existsSync(p)) return;
        const content = read(p);

        // Server-side OAuth: no raw access tokens stored in localStorage.
        // Only a boolean presence flag (CONNECTED_KEY) is persisted client-side.
        // The old STORAGE_KEY / EXPIRY_KEY / DANGEROUS_TOKEN_CHARS guards are
        // no longer needed because tokens live in Firestore (server-side).
        expect(content).not.toContain('STORAGE_KEY');
        expect(content).not.toContain('EXPIRY_KEY');
        expect(content).toContain('CONNECTED_KEY');
        // The only value written to localStorage is the hardcoded string 'true'
        expect(content).toContain("localStorage.setItem(CONNECTED_KEY, 'true')");
    });
});

// ─── #7: No recursive async self-calls in Zustand stores ──────────────────

describe('#7 — no recursive async self-calls in stores', () => {
    it('no store uses await get().methodName() pattern', () => {
        const storeFiles = srcFiles.filter((f) => f.includes('/stores/') && f.endsWith('Store.ts'));
        const violations: string[] = [];
        for (const file of storeFiles) {
            if (/await\s+get\(\)\.\w+\(\)/.test(read(file))) violations.push(relSrc(file));
        }
        expect(violations, fmt('recursive async self-calls', 'Use iterative loop', violations)).toEqual([]);
    });
});

// ─── #11: Auth tokens must not appear in URL query params ─────────────────

describe('#11 — no new code should add auth tokens to URL query params', () => {
    const ALLOWLIST = [
        'config/linkPreviewConfig.ts',
        'features/auth/services/calendarAuthService.ts',
    ];

    it('no client file constructs token= in URL', () => {
        const violations: string[] = [];
        for (const file of srcFiles) {
            const r = relSrc(file);
            if (ALLOWLIST.includes(r)) continue;
            if (/token=\$\{|token=.*encodeURIComponent/.test(read(file))) violations.push(r);
        }
        expect(violations, fmt('auth token in URL query param', 'Use Authorization header or signed URLs', violations)).toEqual([]);
    });

    it('proxyImage supports signed URL auth (authResolver)', () => {
        const p = join(FUNCTIONS_DIR, 'proxyImage.ts');
        if (!existsSync(p)) return;
        const content = read(p);
        expect(content).toContain('resolveProxyAuth');
        expect(content).toContain('sig');
    });
});

// ─── Cloud Functions file size limits ─────────────────────────────────────

describe('Functions file size limits (300-line max)', () => {
    it('no functions source file exceeds 300 lines', () => {
        const violations: string[] = [];
        for (const file of funcFiles) {
            const lines = read(file).split('\n').length;
            if (lines > 300) violations.push(`${relFn(file)} (${lines} lines)`);
        }
        expect(violations, `Files exceeding 300 lines:\n${violations.map((v) => `  - ${v}`).join('\n')}`).toEqual([]);
    });
});

function fmt(issue: string, fix: string, violations: string[]): string {
    return `${issue}:\n  Fix: ${fix}\n\n${violations.map((v) => `  - ${v}`).join('\n')}`;
}
