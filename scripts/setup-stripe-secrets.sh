#!/usr/bin/env bash
#
# setup-stripe-secrets.sh — Store Stripe secrets in Google Cloud Secret Manager
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project set: gcloud config set project actionstation-244f0
#   - Secret Manager API enabled
#
# Usage:
#   ./scripts/setup-stripe-secrets.sh
#
# This script creates/updates the following secrets in GCP Secret Manager:
#   - STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
#   - STRIPE_WEBHOOK_SECRET (whsec_...)
#   - VITE_STRIPE_PUBLISHABLE_KEY (pk_live_... or pk_test_...)
#   - TURNSTILE_SECRET (from Cloudflare dashboard)
#
# It also:
#   1. Grants the default Cloud Functions service account access to secrets
#   2. Stores the publishable key as a GitHub Actions secret
#
# After running this script:
#   - Deploy Cloud Functions: firebase deploy --only functions
#   - Add VITE_STRIPE_PUBLISHABLE_KEY and VITE_TURNSTILE_SITE_KEY to GitHub Secrets
#
set -euo pipefail

PROJECT_ID="actionstation-244f0"
SA="actionstation-244f0@appspot.gserviceaccount.com"

echo "==> Setting project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" --quiet

echo "==> Enabling Secret Manager API (if not already enabled)"
gcloud services enable secretmanager.googleapis.com --project "${PROJECT_ID}"

# ── Helper: create or update a secret ──────────────────────────────────────

create_or_update_secret() {
    local SECRET_NAME="$1"
    local SECRET_VALUE="$2"

    if gcloud secrets describe "${SECRET_NAME}" --project "${PROJECT_ID}" &>/dev/null; then
        echo "    Secret '${SECRET_NAME}' exists — adding new version"
    else
        echo "    Creating secret '${SECRET_NAME}'"
        gcloud secrets create "${SECRET_NAME}" \
            --replication-policy="automatic" \
            --project "${PROJECT_ID}" \
            --quiet
    fi

    echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
        --data-file=- \
        --project "${PROJECT_ID}" \
        --quiet

    echo "    ✓ ${SECRET_NAME} version added"
}

# ── Helper: grant SA access to a secret ────────────────────────────────────

grant_sa_access() {
    local SECRET_NAME="$1"
    echo "    Granting ${SA} access to ${SECRET_NAME}"
    gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
        --member="serviceAccount:${SA}" \
        --role="roles/secretmanager.secretAccessor" \
        --project "${PROJECT_ID}" \
        --quiet
}

# ── Prompt for secrets ────────────────────────────────────────────────────

echo ""
echo "Enter your secrets (input hidden for security):"
echo ""

read -rsp "Stripe Secret Key (sk_live_... or sk_test_...): " STRIPE_SECRET_KEY
echo ""
read -rsp "Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
echo ""
read -rsp "Stripe Publishable Key (pk_live_... or pk_test_...): " STRIPE_PUBLISHABLE_KEY
echo ""
read -rsp "Cloudflare Turnstile Secret Key: " TURNSTILE_SECRET
echo ""
read -rsp "Razorpay Key ID (rzp_live_... or rzp_test_...): " RAZORPAY_KEY_ID
echo ""
read -rsp "Razorpay Key Secret: " RAZORPAY_KEY_SECRET
echo ""
read -rsp "Razorpay Webhook Secret: " RAZORPAY_WEBHOOK_SECRET
echo ""

if [[ -z "${STRIPE_SECRET_KEY}" || -z "${STRIPE_WEBHOOK_SECRET}" || -z "${STRIPE_PUBLISHABLE_KEY}" || -z "${TURNSTILE_SECRET}" || -z "${RAZORPAY_KEY_ID}" || -z "${RAZORPAY_KEY_SECRET}" || -z "${RAZORPAY_WEBHOOK_SECRET}" ]]; then
    echo "ERROR: All seven secrets are required. Aborting."
    exit 1
fi

# ── Store secrets ─────────────────────────────────────────────────────────

echo ""
echo "==> Storing secrets in GCP Secret Manager"

create_or_update_secret "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY}"
create_or_update_secret "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET}"
create_or_update_secret "TURNSTILE_SECRET" "${TURNSTILE_SECRET}"
create_or_update_secret "RAZORPAY_KEY_ID" "${RAZORPAY_KEY_ID}"
create_or_update_secret "RAZORPAY_KEY_SECRET" "${RAZORPAY_KEY_SECRET}"
create_or_update_secret "RAZORPAY_WEBHOOK_SECRET" "${RAZORPAY_WEBHOOK_SECRET}"

# Publishable key is not stored in Secret Manager (it's a build-time env var)
# But we store it here for documentation and deploy.yml reference
echo ""
echo "==> Note: VITE_STRIPE_PUBLISHABLE_KEY is injected at build time via GitHub Secrets."
echo "    Add it to GitHub repo settings → Secrets and variables → Actions:"
echo "    Name: VITE_STRIPE_PUBLISHABLE_KEY"
echo "    Value: ${STRIPE_PUBLISHABLE_KEY}"

# ── Grant SA access ───────────────────────────────────────────────────────

echo ""
echo "==> Granting service account access to secrets"
grant_sa_access "STRIPE_SECRET_KEY"
grant_sa_access "STRIPE_WEBHOOK_SECRET"
grant_sa_access "TURNSTILE_SECRET"
grant_sa_access "RAZORPAY_KEY_ID"
grant_sa_access "RAZORPAY_KEY_SECRET"
grant_sa_access "RAZORPAY_WEBHOOK_SECRET"

# ── Verify ────────────────────────────────────────────────────────────────

echo ""
echo "==> Verifying secret access"
for SECRET in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET TURNSTILE_SECRET RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET; do
    if gcloud secrets versions access latest --secret="${SECRET}" --project "${PROJECT_ID}" &>/dev/null; then
        echo "    ✓ ${SECRET} accessible"
    else
        echo "    ✗ ${SECRET} NOT accessible — check IAM permissions"
    fi
done

echo ""
echo "==> Secrets setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add VITE_STRIPE_PUBLISHABLE_KEY to GitHub Secrets"
echo "  2. Add VITE_TURNSTILE_SITE_KEY to GitHub Secrets (from Cloudflare dashboard)"
echo "  3. Deploy Cloud Functions: firebase deploy --only functions"
echo "  4. Deploy Hosting: firebase deploy --only hosting"
echo ""
