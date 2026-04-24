/**
 * useFocusTrap — Traps keyboard focus within a container when a dialog is open.
 *
 * Behaviour:
 * - When `isOpen` becomes true: focus the first focusable element.
 * - Tab / Shift+Tab cycle only within the container's focusable elements.
 * - When `isOpen` becomes false: restore focus to the previously focused element.
 * - Cleans up the keydown listener on unmount or when `isOpen` toggles.
 *
 * FOCUSABLE_SELECTORS covers interactive elements that receive keyboard focus.
 * Excludes disabled elements and elements with tabIndex < 0 (except the
 * container itself when it receives programmatic focus via tabIndex={-1}).
 */
import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'details > summary',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)];
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, isOpen: boolean): void {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen || !ref.current) return;

        previousFocusRef.current = document.activeElement as HTMLElement;
        const container = ref.current;
        const focusable = getFocusableElements(container);
        focusable[0]?.focus();

        function handleKeyDown(e: KeyboardEvent): void {
            if (e.key !== 'Tab') return;
            // Re-query on each Tab to handle dynamically added/removed elements.
            const elements = getFocusableElements(container);
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (!first || !last) { e.preventDefault(); return; }

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        container.addEventListener('keydown', handleKeyDown);
        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus on unmount — covers components that pass isOpen=true
            // and simply unmount on close (isOpen never transitions to false).
            previousFocusRef.current?.focus();
        };
    }, [isOpen, ref]);

    // Also restore focus when isOpen transitions from true → false (controlled dialogs).
    useEffect(() => {
        if (!isOpen) {
            previousFocusRef.current?.focus();
        }
    }, [isOpen]);
}
