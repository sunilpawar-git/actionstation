/**
 * Structural test: Monitoring alerts completeness
 *
 * High-severity SecurityEventType values must have corresponding logs-based
 * metrics and alert policies in scripts/setup-monitoring-alerts.sh.
 *
 * High-severity events requiring monitoring:
 *   - auth_failure    (credential stuffing — CRITICAL, >10/min)
 *   - bot_detected    (scanner/probe activity — HIGH, >5/min)
 *
 * FIX: Add gcloud logging metrics create <event_type> entries and
 *      corresponding alert policies to setup-monitoring-alerts.sh.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const SCRIPT_PATH = join(ROOT, 'scripts', 'setup-monitoring-alerts.sh');

const scriptSource = readFileSync(SCRIPT_PATH, 'utf-8');

describe('Monitoring alerts — coverage of high-severity security events', () => {
    it('creates a logs-based metric for auth_failure events', () => {
        expect(
            scriptSource,
            'setup-monitoring-alerts.sh must create a logs-based metric filtering on event_type="auth_failure".',
        ).toMatch(/event_type.*auth_failure|auth_failure.*event_type/);
    });

    it('creates a logs-based metric for bot_detected events', () => {
        expect(
            scriptSource,
            'setup-monitoring-alerts.sh must create a logs-based metric filtering on event_type="bot_detected".',
        ).toMatch(/event_type.*bot_detected|bot_detected.*event_type/);
    });

    it('creates an alert policy for auth_failure spike (threshold > 10/min)', () => {
        expect(
            scriptSource,
            'setup-monitoring-alerts.sh must contain an alert policy for auth_failure_spike with threshold condition.',
        ).toMatch(/auth_failure_spike/);
    });

    it('creates an alert policy for bot_detected spike (threshold > 5/min)', () => {
        expect(
            scriptSource,
            'setup-monitoring-alerts.sh must contain an alert policy for bot_detected_spike with threshold condition.',
        ).toMatch(/bot_detected_spike/);
    });

    it('auth_failure alert policy uses CRITICAL severity', () => {
        // The auth-failure-alert.json heredoc must specify "severity": "CRITICAL"
        // to trigger PagerDuty/on-call escalation for credential stuffing attacks.
        expect(
            scriptSource,
            'auth_failure alert must use "severity": "CRITICAL".',
        ).toMatch(/"severity":\s*"CRITICAL"/);
    });

    it('auth_failure alert threshold is 10 per minute', () => {
        expect(
            scriptSource,
            'auth_failure alert must have thresholdValue of 10 (triggers at > 10 events/min).',
        ).toMatch(/auth_failure_spike[^}]*thresholdValue[^}]*10/s);
    });

    it('bot_detected alert threshold is 5 per minute', () => {
        expect(
            scriptSource,
            'bot_detected alert must have thresholdValue of 5 (triggers at > 5 events/min).',
        ).toMatch(/bot_detected_spike[^}]*thresholdValue[^}]*5/s);
    });

    it('Slack notification channel uses url= label (not auth_token=)', () => {
        // GCP Slack channel type requires the label key "url", not "auth_token".
        // Using "auth_token" creates a silently broken channel that never delivers alerts.
        expect(
            scriptSource,
            'Slack channel must be created with --channel-labels="url=..." not "auth_token=...".',
        ).toMatch(/channel-labels="url=/);
        expect(
            scriptSource,
            'Slack channel must NOT use auth_token label key (GCP ignores it silently).',
        ).not.toMatch(/channel-labels="auth_token=/);
    });
});
