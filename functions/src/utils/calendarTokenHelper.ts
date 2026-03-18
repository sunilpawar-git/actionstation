/**
 * Google Calendar Token Helper
 * Retrieves and refreshes Google OAuth access tokens from Firestore.
 * Shared by calendarAuth and calendarEvents Cloud Functions.
 * Access tokens are cached in Firestore (with expiry) to minimise round-trips
 * to Google's token endpoint.
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';

/** Error thrown when the Firestore integration document does not exist. */
export const CALENDAR_NOT_CONNECTED = 'CALENDAR_NOT_CONNECTED';

/** Refresh access token 5 minutes before it expires to avoid races. */
const TOKEN_BUFFER_MS = 5 * 60 * 1_000;

interface IntegrationData {
    refreshToken: string;
    accessToken?: string | null;
    expiryDate?: number | null;
}

/**
 * Return a valid Google Calendar access token for the given user.
 * Reads cached token from Firestore; refreshes via OAuth2 if expired.
 * Throws CALENDAR_NOT_CONNECTED when the integration document is missing.
 */
export async function getCalendarAccessToken(
    uid: string,
    clientId: string,
    clientSecret: string,
): Promise<string> {
    const docRef = getFirestore()
        .collection('users').doc(uid)
        .collection('integrations').doc('calendar');

    const doc = await docRef.get();
    if (!doc.exists) throw new Error(CALENDAR_NOT_CONNECTED);

    const data = doc.data() as IntegrationData;
    if (!data.refreshToken) throw new Error(CALENDAR_NOT_CONNECTED);

    // Return cached access token if still valid
    if (
        data.accessToken &&
        data.expiryDate &&
        data.expiryDate > Date.now() + TOKEN_BUFFER_MS
    ) {
        return data.accessToken;
    }

    // Refresh the access token using the stored refresh token
    const oauth2 = new OAuth2Client(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: data.refreshToken });

    const { credentials } = await oauth2.refreshAccessToken();
    if (!credentials.access_token) throw new Error('Token refresh failed');

    await docRef.update({
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date ?? null,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return credentials.access_token;
}
