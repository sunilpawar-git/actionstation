/**
 * Scheduled Firestore Backup — runs daily at 02:00 UTC.
 * Exports the entire Firestore database to a dedicated Cloud Storage bucket.
 * The export path is dated so each day's backup is a separate, restorable snapshot.
 *
 * Setup required (one-time, already done if FIREBASE_SERVICE_ACCOUNT has the role):
 *   gcloud projects add-iam-policy-binding actionstation-244f0 \
 *     --member="serviceAccount:actionstation-244f0@appspot.gserviceaccount.com" \
 *     --role="roles/datastore.importExportAdmin"
 *   gsutil mb -p actionstation-244f0 gs://actionstation-244f0-firestore-backups
 *   gsutil lifecycle set storage-lifecycle.json gs://actionstation-244f0-firestore-backups
 *
 * Restore a backup:
 *   gcloud firestore import gs://actionstation-244f0-firestore-backups/YYYY-MM-DD/
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'actionstation-244f0';
const BACKUP_BUCKET = `gs://${PROJECT_ID}-firestore-backups`;
const FIRESTORE_EXPORT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments`;

export const firestoreBackup = onSchedule(
    {
        schedule: '0 2 * * *', // 02:00 UTC daily
        timeZone: 'UTC',
        minInstances: 0,
        timeoutSeconds: 540, // 9 min — exports can be slow for large datasets
    },
    async () => {
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const outputUriPrefix = `${BACKUP_BUCKET}/${date}`;

        logger.info(`Starting Firestore export to ${outputUriPrefix}`);

        try {
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            });
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            const response = await fetch(FIRESTORE_EXPORT_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ outputUriPrefix }),
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Export failed (${response.status}): ${body}`);
            }

            const operation = (await response.json()) as { name?: string };
            logger.info(`Firestore export operation started: ${operation.name}`);
            logger.info(`Backup path: ${outputUriPrefix}`);
        } catch (err) {
            logger.error('Firestore backup failed', err);
            throw err; // Re-throw so Cloud Scheduler marks the job as failed
        }
    },
);
