export const securityStrings = {
    envMissing: (name: string) => `Required config ${name} is not set`,
    fetchTimeout: 'Request timed out. Please try again.',
    tokenInvalid: 'Invalid authentication token format.',
    storageQuotaExceeded: 'Local storage is full. Some changes may not be saved offline.',
    idbReadFailed: 'IndexedDB read failed',
    idbWriteFailed: 'IndexedDB write failed',
    idbDeleteFailed: 'IndexedDB delete failed',
    localStorageWriteFailed: 'localStorage write failed',
} as const;
