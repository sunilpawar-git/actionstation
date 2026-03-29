# STRIDE Threat Model — Stripe Payment Integration

> **System**: ActionStation Stripe payment integration
> **Date**: 29 March 2026
> **Version**: 1.0
> **Methodology**: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)

---

## System Description

The payment system consists of three Cloud Functions (`createCheckoutSession`, `stripeWebhook`, `createBillingPortalSession`) that integrate with Stripe's hosted checkout and billing portal. Card data never enters ActionStation infrastructure (PCI SAQ A).

## Data Flow

```
User → LoginPage (Turnstile CAPTCHA) → Firebase Auth → createCheckoutSession
→ Stripe Checkout (hosted) → stripeWebhook → Firestore subscription/current
→ Client reads subscription state
```

---

## Threat Analysis

### S — Spoofing

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| S-1 | Fake webhook pretending to be Stripe | `stripeWebhook` | HMAC-SHA256 signature verification via `STRIPE_WEBHOOK_SECRET` | Low |
| S-2 | Attacker creates checkout for another user | `createCheckoutSession` | Firebase Auth ID token verification → UID extracted server-side | Low |
| S-3 | Stolen Firebase ID token | `createCheckoutSession` | Token expiry (1hr), IP rate limiting, bot detection | Medium |
| S-4 | Bot impersonating browser | All Cloud Functions | `detectBot()` + Turnstile CAPTCHA on login | Low |

### T — Tampering

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| T-1 | Webhook payload modified in transit | `stripeWebhook` | Stripe signature verification covers entire payload | Low |
| T-2 | Client modifies subscription document | Firestore | `allow write: if false` on subscription subcollection | Low |
| T-3 | Client modifies `_webhookEvents` | Firestore | `allow write: if false` on `_webhookEvents` collection | Low |
| T-4 | Request body tampering | All Cloud Functions | Price ID whitelist, hardcoded URLs, auth verification | Low |

### R — Repudiation

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| R-1 | User claims they never subscribed | All | Stripe receipts + Cloud Logging audit trail + `lastEventId` correlation | Low |
| R-2 | Duplicate webhook processing | `stripeWebhook` | Idempotency guard via `_webhookEvents/{eventId}` | Low |
| R-3 | Unauthorized key rotation | GCP Secret Manager | Cloud Audit Logs (immutable, 400-day retention) | Low |

### I — Information Disclosure

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| I-1 | Stripe secret key in client bundle | Client | `defineSecret()` server-side only. Structural test scans `src/` for forbidden patterns | Low |
| I-2 | Stripe secret key in logs | Cloud Functions | `filterPromptOutput` scans for key patterns. `logSecurityEvent` never includes secret values | Low |
| I-3 | Stripe secret key in error reports | Sentry | `maskAllText: true`, `blockAllMedia: true` | Low |
| I-4 | PAN/CVV in our infrastructure | All | Stripe Checkout hosted page — card data never enters our environment (SAQ A) | N/A |
| I-5 | Customer email leakage | Firestore | Only Stripe customer ID stored — billing email managed by Stripe | Low |

### D — Denial of Service

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| D-1 | Flood of fake webhooks | `stripeWebhook` | Cloud Armor rate limit + signature verification rejects invalid payloads quickly | Low |
| D-2 | Flood of checkout creations | `createCheckoutSession` | IP rate limit (10/min) + user rate limit (5/min) + Cloud Armor (100/min) | Medium |
| D-3 | Webhook delivery failure | Stripe → Cloud Function | Stripe retries for 72h. `minInstances: 1` avoids cold starts | Low |

### E — Elevation of Privilege

| # | Threat | Component | Mitigation | Risk |
|---|--------|-----------|------------|------|
| E-1 | Free user manipulates client to access Pro features | Client | Server-side enforcement via Firestore rules. Client gate is UX only. `isActive` checked. | Low |
| E-2 | Expired subscription retains Pro | Client + webhook | `subscriptionService` checks `expiresAt`. Webhook updates on `customer.subscription.deleted`. | Low |
| E-3 | Payment failed but Pro still active | Webhook handler | `invoice.payment_failed` writes `isActive: false`. `hasFeatureAccess` checks `isActive`. | Low |

---

## Risk Summary

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | S-3 (stolen token), D-2 (checkout flood) |
| Low | 16 | All others |

**Overall risk level: LOW** — Strong defense in depth with signature verification, rate limiting, server-side validation, and client-side structural tests.

---

## Recommendations

1. **Immediate**: None — all mitigations are in place
2. **Short-term**: Monitor webhook signature failure rate (alert if >5/min)
3. **Long-term**: Add Cloud Armor WAF deployment (script exists)
4. **Ongoing**: Quarterly key rotation per lifecycle document

---

*Last reviewed: 29 March 2026*
*Next review: Launch + 90 days*
