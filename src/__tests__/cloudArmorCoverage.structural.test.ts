/**
 * Structural test: Cloud Armor WAF script coverage
 *
 * Every Cloud Function exported from functions/src/index.ts must appear
 * (lowercased) in the SERVICES array of scripts/setup-cloud-armor.sh.
 *
 * This prevents the silent production gap where new Cloud Functions bypass
 * the WAF simply because the script was not updated.
 *
 * FIX: Update SERVICES array in scripts/setup-cloud-armor.sh when adding
 *      new Cloud Functions to functions/src/index.ts.
 *
 * Also enforces:
 *   - No typos in service names (exact lowercase match to function names)
 *   - Webhook burst protection rule exists (priority 850)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, 'functions', 'src', 'index.ts');
const SCRIPT_PATH = join(ROOT, 'scripts', 'setup-cloud-armor.sh');

/** Extract all exported function names from functions/src/index.ts */
function extractFunctionExports(source: string): string[] {
    const names: string[] = [];

    // Match: export { name1, name2, ... } from './file.js'
    // and:   export { name } from './file.js'
    const blockExports = source.matchAll(/^export\s*\{([^}]+)\}\s*from/gm);
    for (const match of blockExports) {
        const group = match[1] ?? '';
        for (const raw of group.split(',')) {
            // Handle "original as alias" — take the exported name (alias if present)
            const parts = raw.trim().split(/\s+as\s+/);
            const name = (parts[1] ?? parts[0] ?? '').trim();
            if (name) names.push(name);
        }
    }

    // Match: export { name } (re-export without 'from')
    const bareExports = source.matchAll(/^export\s*\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}/gm);
    for (const match of bareExports) {
        const name = match[1];
        if (name) names.push(name);
    }

    return names.filter(Boolean);
}

/** Extract the SERVICES array values from the shell script */
function extractServicesFromScript(source: string): Set<string> {
    const match = /SERVICES=\(\s*([\s\S]*?)\s*\)/.exec(source);
    if (!match) return new Set();
    const raw = match[1] ?? '';
    const services = new Set<string>();
    for (const line of raw.split('\n')) {
        const trimmed = line.trim().replace(/^["']|["']$/g, '');
        if (trimmed) services.add(trimmed);
    }
    return services;
}

const indexSource = readFileSync(INDEX_PATH, 'utf-8');
const scriptSource = readFileSync(SCRIPT_PATH, 'utf-8');

const exportedFunctions = extractFunctionExports(indexSource);
const servicesInScript = extractServicesFromScript(scriptSource);

/** Extract backend service names from the URL map heredoc (strips 'backend-' prefix) */
function extractUrlMapServices(source: string): Set<string> {
    const services = new Set<string>();
    // Matches: service: global/backendServices/backend-<name>
    for (const match of source.matchAll(/service:\s*global\/backendServices\/backend-([a-z0-9]+)/g)) {
        const svc = match[1];
        if (svc) services.add(svc);
    }
    return services;
}

const urlMapServices = extractUrlMapServices(scriptSource);

describe('Cloud Armor WAF — service coverage', () => {
    it('every exported Cloud Function is in the SERVICES array (lowercased)', () => {
        const missing: string[] = [];
        for (const fn of exportedFunctions) {
            const lower = fn.toLowerCase();
            if (!servicesInScript.has(lower)) {
                missing.push(`${fn} (lowercased: "${lower}")`);
            }
        }
        expect(
            missing,
            `Missing from SERVICES in setup-cloud-armor.sh:\n  ${missing.join('\n  ')}\n\nFix: add the above service name(s) to the SERVICES=() array.`,
        ).toHaveLength(0);
    });

    it('SERVICES array contains no typos (all entries match a known export)', () => {
        const lowerExports = new Set(exportedFunctions.map(fn => fn.toLowerCase()));
        const orphans: string[] = [];
        for (const svc of servicesInScript) {
            if (!lowerExports.has(svc)) {
                orphans.push(svc);
            }
        }
        expect(
            orphans,
            `SERVICES entries with no matching Cloud Function export:\n  ${orphans.join('\n  ')}\n\nFix: remove or correct typos in the SERVICES=() array.`,
        ).toHaveLength(0);
    });

    it('webhook rate-limit rule exists at priority 850', () => {
        expect(
            scriptSource,
            'setup-cloud-armor.sh must contain a rate-limit rule at priority 850 for webhook burst protection.',
        ).toMatch(/rules create 850/);
    });

    it('webhook rule targets stripeWebhook and razorpayWebhook paths', () => {
        expect(
            scriptSource,
            'Webhook rate-limit rule must match stripeWebhook path.',
        ).toMatch(/stripeWebhook/);
        expect(
            scriptSource,
            'Webhook rate-limit rule must match razorpayWebhook path.',
        ).toMatch(/razorpayWebhook/);
    });

    it('every SERVICES entry has a pathRules entry in the URL map (prevents silent traffic misrouting)', () => {
        const missing: string[] = [];
        for (const svc of servicesInScript) {
            if (!urlMapServices.has(svc)) {
                missing.push(svc);
            }
        }
        expect(
            missing,
            `SERVICES entries missing from URL map pathRules:\n  ${missing.join('\n  ')}\n\nFix: add pathRules entries in the url-maps import heredoc in setup-cloud-armor.sh.`,
        ).toHaveLength(0);
    });
});
