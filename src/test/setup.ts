import { vi } from 'vitest';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// jsdom does not implement ResizeObserver — provide a no-op stub
global.ResizeObserver = class ResizeObserver {
    observe() { /* no-op */ }
    unobserve() { /* no-op */ }
    disconnect() { /* no-op */ }
};

// Provide dummy API keys for tests to prevent CI failures
vi.stubEnv('VITE_GEMINI_API_KEY', 'dummy_test_key');
vi.stubEnv('VITE_FIREBASE_API_KEY', 'dummy_test_key');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'dummy_project_id');
vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://us-central1-test-project.cloudfunctions.net');

// Fail tests on React act() warnings to prevent recurrence
const originalError = console.error;
console.error = (...args: unknown[]) => {
    const message = String(args[0]);
    if (message.includes('not wrapped in act(...)')) {
        throw new Error(`Test failed: React state update not wrapped in act():\n${args.join(' ')}`);
    }
    originalError.apply(console, args);
};
