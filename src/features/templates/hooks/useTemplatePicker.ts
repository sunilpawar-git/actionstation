/**
 * useTemplatePicker — manages template picker open/close state and loads
 * custom templates from Firestore when the picker is opened.
 */
import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getCustomTemplates } from '@/features/templates/services/customTemplateService';
import { logger } from '@/shared/services/logger';
import type { WorkspaceTemplate } from '@/features/templates/types/template';

export interface UseTemplatePickerReturn {
    readonly isPickerOpen: boolean;
    readonly customTemplates: WorkspaceTemplate[];
    readonly isLoadingTemplates: boolean;
    readonly openPicker: () => void;
    readonly closePicker: () => void;
}

export function useTemplatePicker(): UseTemplatePickerReturn {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<WorkspaceTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    const openPicker = useCallback(() => setIsPickerOpen(true), []);
    const closePicker = useCallback(() => setIsPickerOpen(false), []);

    useEffect(() => {
        if (!isPickerOpen || !userId) return;
        setIsLoadingTemplates(true);
        getCustomTemplates(userId)
            .then(setCustomTemplates)
            .catch((err: unknown) => {
                logger.error('[useTemplatePicker] Failed to load custom templates', err);
                setCustomTemplates([]);
            })
            .finally(() => setIsLoadingTemplates(false));
    }, [isPickerOpen, userId]);

    return { isPickerOpen, customTemplates, isLoadingTemplates, openPicker, closePicker };
}
