#!/usr/bin/env bash
# =============================================================================
# setup-immutable-backups.sh — GCS object retention for Firestore backup bucket
#
# GCS object retention (formerly "object lock") makes backup objects immutable
# for a minimum retention period.  Once the retention policy is *locked*:
#   • No one can delete or overwrite objects before the retention period expires
#   • Not even project owners, not even Google Support
#   • The lock itself cannot be removed (irrevocable)
#
# This protects against ransomware, insider deletion, and accidental wipes.
#
# ─── What this script does ───────────────────────────────────────────────────
#
#   1. Creates a NEW backup bucket with uniform bucket-level access
#      (required for retention policies)
#   2. Enables object versioning (allows recovery of overwritten objects)
#   3. Sets a 30-day retention policy on the bucket
#   4. OPTIONALLY locks the retention policy (irreversible — prompts first)
#   5. Updates the lifecycle rule file for the new bucket
#
# ─── Why a new bucket? ───────────────────────────────────────────────────────
#
# GCS retention policies apply only to objects written AFTER the policy is set.
# Creating a fresh bucket ensures all backup objects are born under the policy.
# The existing bucket (actionstation-244f0-firestore-backups) can be kept as
# a legacy read-only archive and decommissioned after the retention window passes.
#
# ─── After running this script ───────────────────────────────────────────────
#
# Update BACKUP_BUCKET in functions/src/firestoreBackup.ts to point to the
# new bucket name printed by this script.
#
# PREREQUISITES
#   gcloud CLI authenticated:  gcloud auth login
#   Project set:               gcloud config set project $PROJECT_ID
# =============================================================================
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
PROJECT_ID="actionstation-244f0"
OLD_BUCKET="gs://${PROJECT_ID}-firestore-backups"
NEW_BUCKET="gs://${PROJECT_ID}-firestore-backups-immutable"
BUCKET_LOCATION="us-central1"
RETENTION_DAYS=30
SA="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com"

echo "► Project:          $PROJECT_ID"
echo "► Old bucket:       $OLD_BUCKET  (legacy, will remain read-only)"
echo "► New bucket:       $NEW_BUCKET"
echo "► Retention policy: ${RETENTION_DAYS} days"
echo ""

# ─── 1. Create the new bucket ────────────────────────────────────────────────
echo "── Step 1: Creating immutable backup bucket ────────────────────────────"

gsutil mb \
  -p "$PROJECT_ID" \
  -l "$BUCKET_LOCATION" \
  -b on \
  "$NEW_BUCKET" 2>/dev/null \
  || echo "Bucket $NEW_BUCKET already exists, continuing."

echo "Bucket created with uniform bucket-level access."

# ─── 2. Enable object versioning ─────────────────────────────────────────────
echo ""
echo "── Step 2: Enabling object versioning ──────────────────────────────────"
gsutil versioning set on "$NEW_BUCKET"
echo "Versioning enabled — overwritten objects become non-current versions."

# ─── 3. Set retention policy (30 days) ───────────────────────────────────────
echo ""
echo "── Step 3: Setting ${RETENTION_DAYS}-day retention policy ───────────────────────────"
gsutil retention set "${RETENTION_DAYS}d" "$NEW_BUCKET"
echo "Retention policy set.  Objects cannot be deleted for ${RETENTION_DAYS} days after write."

# ─── 4. Grant service account write access ───────────────────────────────────
echo ""
echo "── Step 4: Granting Firestore backup SA write access ────────────────────"
gsutil iam ch "${SA}:objectCreator" "$NEW_BUCKET"
gsutil iam ch "${SA}:objectViewer"  "$NEW_BUCKET"
echo "Service account $SA can now write to $NEW_BUCKET."

# ─── 5. Apply lifecycle rules ────────────────────────────────────────────────
# Keep the lifecycle file to clean up OLD (>90 day) non-current versions.
# We keep 90 days of versions and retain current objects for 30 days minimum
# (enforced by the retention policy above).
echo ""
echo "── Step 5: Applying lifecycle rules ────────────────────────────────────"

cat > /tmp/backup-lifecycle.json << 'LIFECYCLE'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 90,
          "isLive": false
        }
      }
    ]
  }
}
LIFECYCLE

gsutil lifecycle set /tmp/backup-lifecycle.json "$NEW_BUCKET"
rm /tmp/backup-lifecycle.json
echo "Lifecycle rule set: non-current versions deleted after 90 days."

# ─── 6. (Optional) Lock the retention policy — IRREVOCABLE ──────────────────
echo ""
echo "── Step 6: Lock retention policy (OPTIONAL — IRREVERSIBLE) ─────────────"
echo ""
echo "  Locking the retention policy makes it PERMANENT and IRREVOCABLE."
echo "  Once locked:"
echo "    • The 30-day minimum cannot be reduced or removed"
echo "    • Not even project owners can shorten or delete the policy"
echo "    • The bucket cannot be deleted until all objects expire"
echo ""
echo "  This is the strongest protection against ransomware / insider deletion."
echo "  Skip this step if you need flexibility to adjust the policy later."
echo ""
read -rp "  Lock the retention policy now? [y/N] " CONFIRM
CONFIRM="${CONFIRM:-N}"

if [[ "${CONFIRM,,}" == "y" ]]; then
  gsutil retention lock "$NEW_BUCKET"
  echo ""
  echo "  ✓ Retention policy LOCKED on $NEW_BUCKET"
  echo "  ⚠  This is irreversible.  The bucket will enforce 30-day retention forever."
else
  echo "  Skipped.  You can lock later with:"
  echo "    gsutil retention lock $NEW_BUCKET"
fi

# ─── 7. Verify ───────────────────────────────────────────────────────────────
echo ""
echo "── Step 7: Verifying configuration ─────────────────────────────────────"
echo ""
echo "Retention policy:"
gsutil retention get "$NEW_BUCKET"
echo ""
echo "Versioning:"
gsutil versioning get "$NEW_BUCKET"
echo ""
echo "IAM:"
gsutil iam get "$NEW_BUCKET" | grep -A2 "objectCreator\|objectViewer" || true

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✓ Immutable backup bucket ready!"
echo ""
echo "  Next step — update functions/src/firestoreBackup.ts:"
echo ""
echo "    const BACKUP_BUCKET = \`${NEW_BUCKET}\`;"
echo ""
echo "  Then redeploy:"
echo "    firebase deploy --only functions:firestoreBackup"
echo ""
echo "  Old bucket ($OLD_BUCKET) remains intact."
echo "  Keep it as a read-only archive until all objects exceed 30 days,"
echo "  then delete it manually:"
echo "    gsutil -m rm -r $OLD_BUCKET"
echo "    gsutil rb $OLD_BUCKET"
echo "═══════════════════════════════════════════════════════════════════════"
