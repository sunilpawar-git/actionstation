import { CHANGELOG_VERSION } from '../data/changelogEntries';

const STORAGE_KEY = 'lastSeenChangelog';

export function hasNewChangelog(): boolean {
    const seen = localStorage.getItem(STORAGE_KEY);
    return seen !== CHANGELOG_VERSION;
}

export function markChangelogSeen(): void {
    localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
}
