/**
 * health Cloud Function — lightweight liveness probe
 * Returns JSON with status, version, and server timestamp.
 * No auth required — safe for uptime monitoring services.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';

export const health = onRequest({ cors: ALLOWED_ORIGINS }, (_req, res) => {
    res.status(200).json({
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
