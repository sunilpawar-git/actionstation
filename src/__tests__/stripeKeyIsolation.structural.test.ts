/**
 * Structural Test: Stripe Key Isolation (D29)
 * Ensures no Stripe secret keys, webhook secrets, or live/test key patterns
 * appear in client-side source code. Only VITE_STRIPE_PUBLISHABLE_KEY is allowed.
 *
 * Publishable keys (pk_live_, pk_test_) are intentionally NOT forbidden —
 * they are designed to be public (Decision 34).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

/** This test's own filename — must be excluded from the scan */
const THIS_FILE = 'stripeKeyIsolation.structural.test.ts';

function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...getAllTsFiles(full));
        } else if (/\.(ts|tsx)$/.test(full) && !full.endsWith(THIS_FILE)) {
            files.push(full);
        }
    }
    return files;
}

/** Patterns that must NEVER appear in client code */
const FORBIDDEN_PATTERNS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'sk_live_',
    'sk_test_',
    'whsec_',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'rzp_live_',
    'rzp_test_',
];

describe('Stripe key isolation', () => {
    const files = getAllTsFiles(SRC_DIR);

    for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const relative = file.replace(`${process.cwd()}/`, '');

        for (const pattern of FORBIDDEN_PATTERNS) {
            it(`${relative} does not contain ${pattern}`, () => {
                expect(content).not.toContain(pattern);
            });
        }
    }
});
