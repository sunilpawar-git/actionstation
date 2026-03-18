/**
 * useBrowserZoomLock
 *
 * Prevents the **browser** from performing its own pinch-to-zoom on the page
 * so that only the ReactFlow canvas zoom is used.
 *
 * Without this, trackpad pinch / touch pinch sometimes scales the entire
 * viewport (sidebar, toolbar, everything) instead of just the canvas.
 *
 * How it works:
 *  1. Chrome / Firefox report trackpad pinch-to-zoom as `wheel` events with
 *     `ctrlKey: true`. We call `preventDefault()` on those so the browser
 *     compositor doesn't apply page-level zoom.  ReactFlow's internal wheel
 *     handler fires first on its own element and is unaffected.
 *
 *  2. Safari fires proprietary `gesturestart` / `gesturechange` events for
 *     pinch gestures.  We call `preventDefault()` on both to stop Safari's
 *     native zoom.
 *
 * All listeners are attached to `document` (capture: false) and removed on
 * unmount.  Normal scroll (`ctrlKey: false`) is never blocked.
 */
import { useEffect } from 'react';

export function useBrowserZoomLock(): void {
    useEffect(() => {
        /** Block browser zoom triggered by Ctrl+wheel (trackpad pinch). */
        function handleWheel(e: WheelEvent): void {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }

        /** Block Safari's native pinch-zoom gesture. */
        function handleGesture(e: Event): void {
            e.preventDefault();
        }

        // capture: true  ← fires during the CAPTURE phase, before any child
        // element's stopPropagation() (e.g. card content scroll handler) can
        // block the event from reaching this listener.  Without this, the
        // document bubble-phase listener is skipped when a node's content area
        // calls e.stopPropagation(), letting the browser's native zoom win.
        document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        document.addEventListener('gesturestart', handleGesture, { passive: false, capture: true } as AddEventListenerOptions);
        document.addEventListener('gesturechange', handleGesture, { passive: false, capture: true } as AddEventListenerOptions);

        return () => {
            // removeEventListener must pass the same capture flag used during
            // addEventListener, otherwise the listener is NOT removed.
            document.removeEventListener('wheel', handleWheel, { capture: true });
            document.removeEventListener('gesturestart', handleGesture, { capture: true } as EventListenerOptions);
            document.removeEventListener('gesturechange', handleGesture, { capture: true } as EventListenerOptions);
        };
    }, []);
}
