#!/usr/bin/env bash
# setup-monitoring-alerts.sh
# Creates two GCP monitoring alerts:
#   1. Cloud Function error rate > 50/min
#   2. geminiProxy 429 rate > 20/min (logs-based metric)
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

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Done. View alerts at:"
echo "  https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
echo ""
echo "  Check your inbox — GCP will send a verification email"
echo "  for the notification channel. Click it to activate alerts."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
