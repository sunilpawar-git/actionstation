export interface ChangelogEntry {
    version: string;
    date: string;
    items: readonly string[];
}

export const CHANGELOG_VERSION = '2025-07';

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
    {
        version: '2025-07',
        date: 'July 2025',
        items: [
            'Share canvases with a public read-only link',
            'Save and reuse workspace templates',
            'In-app feedback and bug reporting',
        ],
    },
    {
        version: '2025-06',
        date: 'June 2025',
        items: [
            'Security hardening: bot detection, rate limiting, WAF',
            'Undo/redo on the canvas',
            'Onboarding flow for new users',
        ],
    },
    {
        version: '2025-05',
        date: 'May 2025',
        items: [
            'Google Calendar integration',
            'Advanced search with full-text filtering',
            'Stripe and Razorpay payments',
        ],
    },
];
