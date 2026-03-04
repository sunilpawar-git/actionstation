/** Ref-based proximity detection for NodeUtilsBar — sets data attributes (zero React re-renders). */
import { useEffect, useRef, type RefObject } from 'react';
import { recalculatePlacement, checkProximity } from './proximityHelpers';

export { PROXIMITY_THRESHOLD_PX, FLIP_THRESHOLD_PX } from './proximityHelpers';

export function useProximityBar(
    cardRef: RefObject<HTMLElement | null>,
    barRef: RefObject<HTMLElement | null>,
    onProximityLost?: () => void,
): void {
    const onProximityLostRef = useRef(onProximityLost);
    onProximityLostRef.current = onProximityLost;

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        card.setAttribute('data-bar-placement', 'right');

        let leaveTimeout: ReturnType<typeof setTimeout> | null = null;

        const onMouseEnter = (): void => {
            if (leaveTimeout) clearTimeout(leaveTimeout);
            card.setAttribute('data-hovered', 'true');
            recalculatePlacement(card);
        };

        const onMouseMove = (e: MouseEvent): void => {
            const bar = barRef.current;
            if (bar && e.target instanceof Node && bar.contains(e.target)) {
                card.setAttribute('data-bar-proximity', 'near');
                return;
            }
            checkProximity(card, e.clientX);
        };

        const onMouseLeave = (): void => {
            leaveTimeout = setTimeout(() => {
                card.removeAttribute('data-hovered');
                card.removeAttribute('data-bar-proximity');
                onProximityLostRef.current?.();
            }, 300);
        };

        const onResize = (): void => { recalculatePlacement(card); };

        const onFocusIn = (e: FocusEvent): void => {
            const bar = barRef.current;
            if (bar && e.target instanceof Node && bar.contains(e.target)) {
                card.setAttribute('data-bar-focused', 'true');
            }
        };

        const onFocusOut = (e: FocusEvent): void => {
            const bar = barRef.current;
            if (!bar) return;
            const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;
            if (!related || !bar.contains(related)) {
                card.removeAttribute('data-bar-focused');
            }
        };

        card.addEventListener('mouseenter', onMouseEnter);
        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);
        card.addEventListener('focusin', onFocusIn);
        card.addEventListener('focusout', onFocusOut);
        window.addEventListener('resize', onResize, { passive: true });

        return () => {
            if (leaveTimeout) clearTimeout(leaveTimeout);
            card.removeEventListener('mouseenter', onMouseEnter);
            card.removeEventListener('mousemove', onMouseMove);
            card.removeEventListener('mouseleave', onMouseLeave);
            card.removeEventListener('focusin', onFocusIn);
            card.removeEventListener('focusout', onFocusOut);
            window.removeEventListener('resize', onResize);
        };
    }, [cardRef, barRef]);
}
