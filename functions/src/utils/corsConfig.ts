/**
 * CORS Origin Configuration — SSOT for all Cloud Function CORS settings
 * Firebase Functions v2 accepts cors as string[] of allowed origins
 *
 * localhost origins are always included: CORS only restricts browsers, and
 * attackers cannot host malicious pages on a visitor's own localhost.
 */

const ALLOWED_ORIGINS: string[] = [
    'https://actionstation-244f0.web.app',
    'https://actionstation-244f0.firebaseapp.com',
    'https://www.actionstation.in',
    'http://localhost:5173',
    'http://localhost:4173',
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim()).filter(Boolean) ?? [];
ALLOWED_ORIGINS.push(...envOrigins);

export { ALLOWED_ORIGINS };
