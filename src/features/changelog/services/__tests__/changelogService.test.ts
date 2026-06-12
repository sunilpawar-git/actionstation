import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasNewChangelog, markChangelogSeen } from '../changelogService';
import { CHANGELOG_VERSION } from '../../data/changelogEntries';

const STORAGE_KEY = 'lastSeenChangelog';

describe('changelogService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('hasNewChangelog', () => {
        it('returns true when no version is stored (first visit)', () => {
            expect(hasNewChangelog()).toBe(true);
        });

        it('returns false when stored version matches current version', () => {
            localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
            expect(hasNewChangelog()).toBe(false);
        });

        it('returns true when stored version is different from current', () => {
            localStorage.setItem(STORAGE_KEY, '2024-01');
            expect(hasNewChangelog()).toBe(true);
        });
    });

    describe('markChangelogSeen', () => {
        it('stores the current version in localStorage', () => {
            markChangelogSeen();
            expect(localStorage.getItem(STORAGE_KEY)).toBe(CHANGELOG_VERSION);
        });

        it('calling hasNewChangelog after markChangelogSeen returns false', () => {
            expect(hasNewChangelog()).toBe(true);
            markChangelogSeen();
            expect(hasNewChangelog()).toBe(false);
        });
    });
});
