#!/usr/bin/env bash
# setup-monitoring-alerts.sh
# Creates GCP monitoring alerts:
#   1. Cloud Function error rate > 50/min
#   2. geminiProxy 429 rate > 20/min (logs-based metric)
#   3. [Phase 2] Webhook signature failure spike > 5/min (CRITICAL)
#   4. [Phase 2] Webhook processing error rate
#   5. [Phase 2] Checkout 429 rate alert
#
# Prerequisites:
#   brew install google-cloud-sdk
#   gcloud auth login
#
# Run: bash scripts/setup-monitoring-alerts.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-actionstation-244f0}"
NOTIFICATION_EMAIL="${ALERT_EMAIL:-mail.sunilpawar@gmail.com}"

echo "▶ Project: $PROJECT_ID"
echo "▶ Alert email: $NOTIFICATION_EMAIL"
echo ""

# ── 0. Confirm gcloud is authenticated ───────────────────────────────────────
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
  echo "✗ Not authenticated. Run: gcloud auth login"
  exit 1
fi

gcloud config set project "$PROJECT_ID" --quiet 2>/dev/null

# ── 1. Get or create email notification channel ───────────────────────────────
echo "▶ Getting notification channel..."

CHANNEL_NAME=$(gcloud beta monitoring channels list \
  --filter="displayName='Eden Alerts'" \
  --format="value(name)" \
  --project="$PROJECT_ID" 2>/dev/null | head -1)

if [[ -z "$CHANNEL_NAME" ]]; then
  CHANNEL_JSON=$(gcloud beta monitoring channels create \
    --display-name="Eden Alerts" \
    --type=email \
    --channel-labels="email_address=${NOTIFICATION_EMAIL}" \
    --project="$PROJECT_ID" \
    --quiet \
    --format=json 2>/dev/null)
  CHANNEL_NAME=$(echo "$CHANNEL_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
fi

echo "  ✓ Notification channel: $CHANNEL_NAME"
echo ""

# ── 2. Alert: Cloud Function error rate > 50/min (metric-based) ──────────────
echo "▶ Creating alert: Cloud Function error rate > 50/min..."

cat > /tmp/cf-error-alert.json << EOF
{
  "displayName": "Cloud Function Error Rate > 50/min",
  "conditions": [
    {
      "displayName": "Cloud Function execution errors",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status != \"ok\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.label.function_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 50,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL_NAME}"],
  "alertStrategy": { "autoClose": "604800s" },
  "documentation": {
    "content": "A Cloud Function is returning errors at > 50/min. Check: https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_function%22%20severity%3DERROR",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/cf-error-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Error rate alert created" || echo "  (alert may already exist)"
echo ""

# ── 3. Create logs-based metric for geminiProxy 429s ─────────────────────────
echo "▶ Creating logs-based metric: geminiProxy_429..."

gcloud logging metrics create geminiProxy_429 \
  --description="HTTP 429 responses from geminiProxy Cloud Function" \
  --log-filter='httpRequest.status=429 AND resource.type="cloud_function" AND resource.labels.function_name="geminiProxy"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ Logs-based metric created" \
  || echo "  (metric already exists, skipping)"
echo ""

# ── 4. Alert: geminiProxy 429 rate > 20/min (log-based) ──────────────────────
echo "▶ Creating alert: geminiProxy 429 rate > 20/min..."

cat > /tmp/gemini-429-alert.json << EOF
{
  "displayName": "geminiProxy 429 Rate > 20/min",
  "conditions": [
    {
      "displayName": "geminiProxy rate limit hits",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND metric.type = \"logging.googleapis.com/user/geminiProxy_429\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 20,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL_NAME}"],
  "alertStrategy": {
    "notificationRateLimit": { "period": "3600s" }
  },
  "documentation": {
    "content": "geminiProxy is rate-limiting users at > 20/min. Consider increasing GEMINI_RATE_LIMIT in securityConstants.ts or migrating to Redis. See docs/scaling-guide.md",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/gemini-429-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ 429 rate alert created" || echo "  (alert may already exist)"
echo ""

# ── 5. [Phase 2] Logs-based metrics for payment security events ───────────────
echo "▶ Creating logs-based metric: webhook_sig_failure..."

gcloud logging metrics create webhook_sig_failure \
  --description="Stripe webhook signature verification failures" \
  --log-filter='jsonPayload.labels.eden_security="true" AND jsonPayload.labels.event_type="webhook_sig_failure"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ webhook_sig_failure metric created" \
  || echo "  (metric already exists, skipping)"

echo "▶ Creating logs-based metric: payment_failed_events..."

gcloud logging metrics create payment_failed_events \
  --description="Stripe payment failure events from webhooks" \
  --log-filter='jsonPayload.labels.eden_security="true" AND jsonPayload.labels.event_type="payment_failed"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ payment_failed_events metric created" \
  || echo "  (metric already exists, skipping)"

echo "▶ Creating logs-based metric: checkout_429..."

gcloud logging metrics create checkout_429 \
  --description="HTTP 429 responses from checkout session endpoint" \
  --log-filter='httpRequest.status=429 AND resource.type="cloud_function" AND resource.labels.function_name="createCheckoutSession"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ checkout_429 metric created" \
  || echo "  (metric already exists, skipping)"
echo ""

# ── 6. [Phase 2] Alert: Webhook signature failure spike > 5/min (CRITICAL) ────
echo "▶ Creating alert: webhook_sig_failure > 5/min (CRITICAL)..."

cat > /tmp/webhook-sig-alert.json << EOF
{
  "displayName": "CRITICAL: Webhook Signature Failure Spike > 5/min",
  "conditions": [
    {
      "displayName": "Stripe webhook signature verification failures",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND metric.type = \"logging.googleapis.com/user/webhook_sig_failure\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL_NAME}"],
  "alertStrategy": {
    "autoClose": "604800s",
    "notificationRateLimit": { "period": "300s" }
  },
  "severity": "CRITICAL",
  "documentation": {
    "content": "CRITICAL: Stripe webhook signature verification is failing at > 5/min. This could indicate an attack or compromised webhook secret. Immediate investigation required. Runbook: docs/runbooks/PAYMENT-INCIDENTS.md",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/webhook-sig-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Webhook sig failure alert created" || echo "  (alert may already exist)"
echo ""

# ── 7. [Phase 2] Alert: Payment failure rate > 10/hour ────────────────────────
echo "▶ Creating alert: payment_failed > 10/hour..."

cat > /tmp/payment-failed-alert.json << EOF
{
  "displayName": "Payment Failure Spike > 10/hour",
  "conditions": [
    {
      "displayName": "Stripe payment failures",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND metric.type = \"logging.googleapis.com/user/payment_failed_events\"",
        "aggregations": [
          {
            "alignmentPeriod": "3600s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL_NAME}"],
  "alertStrategy": {
    "autoClose": "604800s",
    "notificationRateLimit": { "period": "3600s" }
  },
  "documentation": {
    "content": "More than 10 payment failures in 1 hour. Check Stripe Dashboard for failed payments. Runbook: docs/runbooks/PAYMENT-INCIDENTS.md",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/payment-failed-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Payment failure alert created" || echo "  (alert may already exist)"
echo ""

# ── 8. Auth failure + bot detection metrics and alerts ───────────────────────
echo "▶ Step 8: Auth failure and bot detection monitoring..."

cat > /tmp/checkout-429-alert.json << EOF
{
  "displayName": "Checkout 429 Rate > 10/min",
  "conditions": [
    {
      "displayName": "Checkout session rate limiting",
      "conditionThreshold": {
        "filter": "resource.type = \"cloud_function\" AND metric.type = \"logging.googleapis.com/user/checkout_429\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL_NAME}"],
  "alertStrategy": {
    "autoClose": "604800s",
    "notificationRateLimit": { "period": "3600s" }
  },
  "documentation": {
    "content": "Checkout endpoint is rate-limiting at > 10/min. Possible abuse or legitimate spike. Check IP rate limit config in securityConstants.ts.",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/checkout-429-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Checkout 429 alert created" || echo "  (alert may already exist)"
echo ""

# ── 9. Auth failure + bot detection metrics and alerts ─────────────────────
echo "▶ Step 9: Auth failure and bot detection monitoring..."

# Metric: auth_failure events (credential stuffing detection)
gcloud logging metrics create auth_failure_spike \
  --description="Auth failures logged by Cloud Functions security layer" \
  --log-filter='jsonPayload.labels.eden_security="true" AND jsonPayload.labels.event_type="auth_failure"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ auth_failure_spike metric created" \
  || echo "  (auth_failure_spike metric already exists, skipping)"

# Metric: bot_detected events (scanner/probe activity)
gcloud logging metrics create bot_detected_spike \
  --description="Bot/scanner detections from Cloud Functions bot detector" \
  --log-filter='jsonPayload.labels.eden_security="true" AND jsonPayload.labels.event_type="bot_detected"' \
  --project="$PROJECT_ID" 2>/dev/null \
  && echo "  ✓ bot_detected_spike metric created" \
  || echo "  (bot_detected_spike metric already exists, skipping)"

# Alert: auth_failure > 10/min (CRITICAL — credential stuffing)
cat > /tmp/auth-failure-alert.json << 'EOF'
{
  "displayName": "CRITICAL: Auth Failure Spike > 10/min",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "auth_failure_spike > 10/min",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/auth_failure_spike\" resource.type=\"global\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": { "period": "300s" }
  },
  "severity": "CRITICAL",
  "documentation": {
    "content": "Auth failure spike detected. Possible credential stuffing attack. Check Cloud Logging for auth_failure events and review IP patterns. Block offending IPs via Cloud Armor if needed.",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/auth-failure-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Auth failure CRITICAL alert created" || echo "  (alert may already exist)"

# Alert: bot_detected > 5/min (HIGH — active scanner)
cat > /tmp/bot-detected-alert.json << 'EOF'
{
  "displayName": "HIGH: Bot Detection Spike > 5/min",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "bot_detected_spike > 5/min",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/bot_detected_spike\" resource.type=\"global\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": { "period": "600s" }
  },
  "severity": "WARNING",
  "documentation": {
    "content": "Bot/scanner activity spike detected. Review Cloud Logging for bot_detected events. Consider tightening Cloud Armor scanner-detection rule or adding IP block rules.",
    "mimeType": "text/markdown"
  }
}
EOF

gcloud alpha monitoring policies create \
  --policy-from-file=/tmp/bot-detected-alert.json \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && echo "  ✓ Bot detection HIGH alert created" || echo "  (alert may already exist)"

# Optional: Slack notification channel (requires SLACK_WEBHOOK_URL env var)
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  echo "  ▶ Creating Slack notification channel..."
  SLACK_CHANNEL=$(gcloud beta monitoring channels create \
    --display-name="Eden Slack Alerts" \
    --type=slack \
    --channel-labels="url=${SLACK_WEBHOOK_URL}" \
    --project="$PROJECT_ID" \
    --quiet --format=json 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
  echo "  ✓ Slack channel created: $SLACK_CHANNEL"
  echo "  (Add this channel ID to CRITICAL alert notificationChannels to enable Slack)"
else
  echo "  (SLACK_WEBHOOK_URL not set — skipping Slack channel creation)"
fi
echo ""

# ── 10. Summary ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Done. View alerts at:"
echo "  https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
echo ""
echo "  Alerts created:"
echo "    1. Cloud Function error rate > 50/min"
echo "    2. geminiProxy 429 rate > 20/min"
echo "    3. [Phase 2] Webhook sig failure spike > 5/min (CRITICAL)"
echo "    4. [Phase 2] Payment failure spike > 10/hour"
echo "    5. [Phase 2] Checkout 429 rate > 10/min"
echo "    6. [Phase 6] Auth failure spike > 10/min (CRITICAL)"
echo "    7. [Phase 6] Bot detection spike > 5/min (HIGH)"
echo ""
echo "  Check your inbox — GCP will send a verification email"
echo "  for the notification channel. Click it to activate alerts."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
