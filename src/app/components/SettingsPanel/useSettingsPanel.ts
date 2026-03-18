/**
 * useSettingsPanel — Extracted hook for SettingsPanel lifecycle logic.
 * Handles scroll clamping, tab keyboard navigation, and escape layering.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore, type SettingsTabId } from '@/shared/stores/settingsStore';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';

const TAB_IDS: readonly SettingsTabId[] = [
    'appearance', 'canvas', 'toolbar', 'account', 'keyboard', 'about',
];

export function useSettingsPanel(isOpen: boolean, onClose: () => void) {
    const activeTab = useSettingsStore((s) => s.lastSettingsTab);
    const sectionRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const tabListRef = useRef<HTMLDivElement>(null);

    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, isOpen, onClose);

    useEffect(() => {
        const el = sectionRef.current;
        if (el) el.scrollTop = 0;
    }, [activeTab]);

    useEffect(() => {
        const scrollEl = sectionRef.current;
        const innerEl = innerRef.current;
        if (!scrollEl || !innerEl) return;

        const clampScroll = () => {
            requestAnimationFrame(() => {
                const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
                if (scrollEl.scrollTop > maxScroll) scrollEl.scrollTop = Math.max(0, maxScroll);
            });
        };

        const observer = new ResizeObserver(clampScroll);
        observer.observe(innerEl);
        return () => observer.disconnect();
    }, [isOpen]);

    const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
        const currentIdx = TAB_IDS.indexOf(activeTabRef.current);
        let nextIdx = -1;

        switch (e.key) {
            case 'ArrowRight': nextIdx = (currentIdx + 1) % TAB_IDS.length; break;
            case 'ArrowLeft': nextIdx = (currentIdx - 1 + TAB_IDS.length) % TAB_IDS.length; break;
            case 'Home': nextIdx = 0; break;
            case 'End': nextIdx = TAB_IDS.length - 1; break;
            default: return;
        }

        e.preventDefault();
        const nextTabId = TAB_IDS[nextIdx];
        if (!nextTabId) return;
        useSettingsStore.getState().setLastSettingsTab(nextTabId);

        const tabEl = tabListRef.current?.querySelector<HTMLElement>(
            `[data-tab-id="${nextTabId}"]`,
        );
        tabEl?.focus();
    }, []);

    return { activeTab, sectionRef, innerRef, tabListRef, handleTabKeyDown };
}
