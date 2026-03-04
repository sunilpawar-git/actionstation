/**
 * Storage Utilities - Shared localStorage helpers
 * SSOT for all localStorage access patterns
 */
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';

/** Safely read a typed value from localStorage */
export function getStorageItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;

        if (typeof defaultValue === 'boolean') {
            return (item === 'true') as T;
        }
        if (typeof defaultValue === 'number') {
            const parsed = parseInt(item, 10);
            return (isNaN(parsed) ? defaultValue : parsed) as T;
        }
        return item as T;
    } catch {
        return defaultValue;
    }
}

/** Safely write a primitive value to localStorage */
export function setStorageItem(key: string, value: string | number | boolean): boolean {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.localStorageWriteFailed), { key });
        return false;
    }
}

/** Safely read a string value from localStorage, validated against an allow-list */
export function getValidatedStorageItem<T extends string>(
    key: string,
    defaultValue: T,
    validValues: readonly T[],
): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return validValues.includes(item as T) ? (item as T) : defaultValue;
    } catch {
        return defaultValue;
    }
}

/** Safely read a JSON-parsed value from localStorage */
export function getStorageJson<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch {
        return defaultValue;
    }
}

/** Safely write a JSON-serialized value to localStorage */
export function setStorageJson(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.localStorageWriteFailed), { key });
        return false;
    }
}
