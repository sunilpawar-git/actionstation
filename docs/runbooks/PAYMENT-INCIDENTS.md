# Payment Incident Response Runbook

> **Version**: 1.0 | **Date**: 29 March 2026
> **Owner**: Backend + DevOps teams
> **Review cadence**: Quarterly

---

## Runbook 1: Webhook Delivery Failure

**Trigger**: No webhook events received for >1 hour (monitoring alert)

### Detection
- Cloud Monitoring alert: `webhook_events_processed = 0 for 60 min`
- Stripe Dashboard: Developers → Webhooks → Recent events

### Triage (0–15 min)

1. Check Stripe Dashboard → Webhooks → Recent events
   - Events show **"pending"** or **"failed"**: Stripe is retrying → Monitor
   - Events show **"succeeded"** but no Cloud Logging entries: Our endpoint issue
2. Check Cloud Functions deployment status:
   ```bash
   gcloud functions describe stripeWebhook --region us-central1 --project actionstation-244f0
   ```
3. Check Cloud Armor logs for blocked Stripe IPs:
   ```bash
   gcloud logging read 'resource.type="http_load_balancer" AND jsonPayload.statusDetails="denied_by_security_policy"' --limit=50
   ```

### Containment (15–30 min)

1. If Cloud Armor is blocking Stripe: Temporarily disable the WAF policy
   ```bash
   gcloud compute security-policies update ACTIONSTATION-WAF --rules='[{"priority": 2147483647, "action": "allow"}]'
   ```
2. If Cloud Function is failing: Check function logs
   ```bash
   gcloud functions logs read stripeWebhook --region us-central1 --limit=50
   ```

### Recovery (30 min–4 hours)

1. Fix root cause (WAF rule, code bug, secret issue)
2. Stripe auto-retries for 72h — events will be re-delivered
3. For missed events during outage:
   ```bash
   stripe events resend evt_xxx
   ```
   Idempotency guard prevents duplicate processing.

### Post-Incident
- [ ] Update incident log with root cause
- [ ] Notify affected users if subscription state was impacted
- [ ] File MEMORY.md decision if architectural change needed

---

## Runbook 2: Payment Failure Spike

**Trigger**: >10 payment failures in 1 hour (monitoring alert)

### Triage (0–15 min)

1. Check Stripe Dashboard → Payments → Failed
2. Categorize failures:
   - **Card declined** (customer-side): No action, Stripe sends failure email
   - **Insufficient funds** (customer-side): No action
   - **Stripe API error** (5xx): Check status.stripe.com
   - **Our webhook returning 5xx**: Check Cloud Function logs

### Recovery

| Failure Type | Action |
|-------------|--------|
| Customer card decline | No action — Stripe handles dunning |
| Stripe API error | Monitor status.stripe.com. Existing subscriptions unaffected. |
| Our webhook error | Fix and redeploy. Stripe retries automatically. |
| Rate limit (429) | Increase rate limit if legitimate traffic. Review if abuse. |

### Post-Incident
- [ ] Update incident log
- [ ] If Stripe outage: document impact on billing cycle
- [ ] If our code: add regression test

---

## Runbook 3: Suspected Stripe Key Compromise

**Trigger**: Unusual API activity in Stripe Dashboard, or secret detected in logs/code

### Immediate Actions (< 15 min)

1. **Roll the Stripe API key** in Stripe Dashboard
   - Stripe Dashboard → Developers → API keys → Roll key
   - Stripe provides grace period where both old and new keys work

2. **Update Secret Manager** with new key:
   ```bash
   echo -n "sk_live_NEW_KEY" | gcloud secrets versions add STRIPE_SECRET_KEY --data-file=-
   ```

3. **Force redeploy** all Cloud Functions that use the key:
   ```bash
   firebase deploy --only functions:createCheckoutSession,functions:createBillingPortalSession
   ```

### Verification (15–30 min)

4. Verify new key works: test checkout session creation
5. Disable old key version in Secret Manager:
   ```bash
   gcloud secrets versions disable OLD_VERSION --secret=STRIPE_SECRET_KEY
   ```

### If Webhook Secret Also Compromised

6. Roll webhook signing secret in Stripe Dashboard
7. Update Secret Manager:
   ```bash
   echo -n "whsec_NEW_SECRET" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
   firebase deploy --only functions:stripeWebhook
   ```

### Investigation (30 min–4 hours)

8. Review Stripe Dashboard → Logs for unauthorized API calls during exposure window
9. Review Cloud Audit Logs for unauthorized secret access:
   ```bash
   gcloud logging read 'protoPayload.authenticationInfo.serviceAccountEmail="actionstation-244f0@appspot.gserviceaccount.com" AND protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"' --limit=100
   ```
10. File security incident report

### Post-Incident
- [ ] Destroy compromised secret version after 30-day observation
- [ ] Update key rotation schedule if premature rotation needed
- [ ] Update STRIDE threat model if new attack vector identified
- [ ] Notify stakeholders per incident response procedure

---

## Runbook 4: Subscription State Drift

**Trigger**: Reconciliation script finds Firestore ≠ Stripe

### Triage

1. Run manual reconciliation:
   ```bash
   # Compare Firestore pro user count vs Stripe active subscription count
   # (Future: automated Cloud Function — Phase 3)
   ```
2. Identify which users are affected

### Recovery

| Direction | Action |
|-----------|--------|
| Stripe says active, Firestore says free | Replay latest webhook event for the subscription |
| Stripe says cancelled, Firestore says pro | Write `tier: 'free', isActive: true` to Firestore |
| Stripe says past_due, Firestore says pro active | Write `isActive: false` to Firestore |

### Prevention
- Set up daily reconciliation (automated) — Phase 3
- Monitor `lastEventId` staleness

---

## Escalation Contacts

| Role | Primary | Backup |
|------|---------|--------|
| Backend Lead | [Name] | [Name] |
| DevOps Lead | [Name] | [Name] |
| Security Lead | [Name] | [Name] |
| Product Lead | [Name] | [Name] |

---

*Last reviewed: 29 March 2026*
*Next review: Launch + 30 days*
