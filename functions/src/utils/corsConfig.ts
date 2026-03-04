/**
 * CORS Origin Configuration — SSOT for all Cloud Function CORS settings
 * Firebase Functions v2 accepts cors as string[] of allowed origins
 */

const ALLOWED_ORIGINS: string[] = [
    'https://eden-so.web.app',
    'https://eden-so.firebaseapp.com',
];

if (process.env.FUNCTIONS_EMULATOR === 'true') {
    ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:4173');
}

const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim()).filter(Boolean) ?? [];
ALLOWED_ORIGINS.push(...envOrigins);

export { ALLOWED_ORIGINS };
