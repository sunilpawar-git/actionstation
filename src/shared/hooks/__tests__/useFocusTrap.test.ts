/**
 * useFocusTrap — TDD tests (written BEFORE implementation).
 * Focus trap: when isOpen=true, Tab/Shift+Tab cycle within the container.
 * On close, focus returns to the trigger element.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

function makeContainer(): HTMLDivElement {
    const div = document.createElement('div');
    document.body.appendChild(div);
    return div;
}

function addFocusableButton(container: HTMLElement, label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    container.appendChild(btn);
    return btn;
}

describe('useFocusTrap', () => {
    let container: HTMLDivElement;
    let trigger: HTMLButtonElement;

    beforeEach(() => {
        container = makeContainer();
        trigger = document.createElement('button');
        trigger.textContent = 'open';
        document.body.appendChild(trigger);
    });

    afterEach(() => {
        container.remove();
        trigger.remove();
    });

    it('focuses the first focusable element when trap opens', () => {
        const btn1 = addFocusableButton(container, 'first');
        addFocusableButton(container, 'second');

        trigger.focus();

        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => {
                const ref = useRef<HTMLDivElement>(container);
                useFocusTrap(ref, isOpen);
            },
            { initialProps: { isOpen: false } },
        );

        act(() => { rerender({ isOpen: true }); });
        expect(document.activeElement).toBe(btn1);
    });

    it('restores focus to trigger when trap closes', () => {
        addFocusableButton(container, 'first');
        trigger.focus();

        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => {
                const ref = useRef<HTMLDivElement>(container);
                useFocusTrap(ref, isOpen);
            },
            { initialProps: { isOpen: false } },
        );

        act(() => { rerender({ isOpen: true }); });
        act(() => { rerender({ isOpen: false }); });
        expect(document.activeElement).toBe(trigger);
    });

    it('wraps Tab from last to first focusable element', () => {
        const btn1 = addFocusableButton(container, 'first');
        const btn2 = addFocusableButton(container, 'second');

        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => {
                const ref = useRef<HTMLDivElement>(container);
                useFocusTrap(ref, isOpen);
            },
            { initialProps: { isOpen: false } },
        );

        act(() => { rerender({ isOpen: true }); });

        // Focus last element, then Tab → should wrap to first
        btn2.focus();
        act(() => {
            container.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
            );
        });
        expect(document.activeElement).toBe(btn1);
    });

    it('wraps Shift+Tab from first to last focusable element', () => {
        const btn1 = addFocusableButton(container, 'first');
        const btn2 = addFocusableButton(container, 'second');

        const { rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => {
                const ref = useRef<HTMLDivElement>(container);
                useFocusTrap(ref, isOpen);
            },
            { initialProps: { isOpen: false } },
        );

        act(() => { rerender({ isOpen: true }); });

        // Focus first element, then Shift+Tab → should wrap to last
        btn1.focus();
        act(() => {
            container.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
            );
        });
        expect(document.activeElement).toBe(btn2);
    });

    it('does nothing when isOpen is false', () => {
        const btn1 = addFocusableButton(container, 'first');
        trigger.focus();

        renderHook(() => {
            const ref = useRef<HTMLDivElement>(container);
            useFocusTrap(ref, false);
        });

        expect(document.activeElement).toBe(trigger);
        expect(document.activeElement).not.toBe(btn1);
    });

    it('cleans up the keydown listener on unmount', () => {
        addFocusableButton(container, 'first');
        const removeSpy = vi.spyOn(container, 'removeEventListener');

        const { unmount, rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) => {
                const ref = useRef<HTMLDivElement>(container);
                useFocusTrap(ref, isOpen);
            },
            { initialProps: { isOpen: false } },
        );

        act(() => { rerender({ isOpen: true }); });
        unmount();
        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
});
