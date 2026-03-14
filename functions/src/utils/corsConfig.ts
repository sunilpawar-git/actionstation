/**
 * CORS Origin Configuration — SSOT for all Cloud Function CORS settings
 * Firebase Functions v2 accepts cors as string[] of allowed origins
 *
 * localhost origins are included unconditionally — this is an internal tool,
 * not a public API. Remove them if the project ever becomes multi-tenant.
 */

const ALLOWED_ORIGINS: string[] = [
    'https://eden-so.web.app',
    'https://eden-so.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:4173',
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim()).filter(Boolean) ?? [];
ALLOWED_ORIGINS.push(...envOrigins);

export { ALLOWED_ORIGINS };
