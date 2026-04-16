/**
 * consentService Tests — Phase 4.3
 * TDD: Written before implementation.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { consentService } from '../services/consentService';

const CONSENT_KEY = 'as_analytics_consent';

describe('consentService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('getChoice()', () => {
        it('returns pending when no localStorage entry', () => {
            expect(consentService.getChoice()).toBe('pending');
        });

        it('returns accepted after accept()', () => {
            consentService.accept();
            expect(consentService.getChoice()).toBe('accepted');
        });

        it('returns rejected after reject()', () => {
            consentService.reject();
            expect(consentService.getChoice()).toBe('rejected');
        });

        it('returns pending for unrecognised stored value', () => {
            localStorage.setItem(CONSENT_KEY, 'garbage');
            expect(consentService.getChoice()).toBe('pending');
        });
    });

    describe('hasConsented()', () => {
        it('returns false when no entry', () => {
            expect(consentService.hasConsented()).toBe(false);
        });

        it('returns true after accept()', () => {
            consentService.accept();
            expect(consentService.hasConsented()).toBe(true);
        });

        it('returns false after reject()', () => {
            consentService.reject();
            expect(consentService.hasConsented()).toBe(false);
        });
    });

    describe('accept()', () => {
        it('writes accepted to localStorage', () => {
            consentService.accept();
            expect(localStorage.getItem(CONSENT_KEY)).toBe('accepted');
        });
    });

    describe('reject()', () => {
        it('writes rejected to localStorage', () => {
            consentService.reject();
            expect(localStorage.getItem(CONSENT_KEY)).toBe('rejected');
        });
    });

    describe('clear()', () => {
        it('removes entry from localStorage', () => {
            consentService.accept();
            consentService.clear();
            expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
        });

        it('resets getChoice() to pending', () => {
            consentService.accept();
            consentService.clear();
            expect(consentService.getChoice()).toBe('pending');
        });
    });

    describe('isDntEnabled()', () => {
        afterEach(() => {
            Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
        });

        it('returns true when navigator.doNotTrack is "1"', () => {
            Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
            expect(consentService.isDntEnabled()).toBe(true);
        });

        it('returns false when navigator.doNotTrack is "0"', () => {
            Object.defineProperty(navigator, 'doNotTrack', { value: '0', configurable: true });
            expect(consentService.isDntEnabled()).toBe(false);
        });

        it('returns false when navigator.doNotTrack is null', () => {
            Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
            expect(consentService.isDntEnabled()).toBe(false);
        });
    });
});
