/**
 * useGdprExport — GDPR Article 20 full data export hook
 *
 * Wraps fetchAllUserData with loading state management and file download.
 * Uses primitive Zustand selectors to avoid ReactFlow cascade re-renders.
 * Throws if user is not authenticated — guard in the UI layer.
 */
import { useCallback, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { downloadAsFile } from '@/shared/utils/fileDownload';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import { strings } from '@/shared/localization/strings';
import { fetchAllUserData } from '../services/gdprExportService';

interface UseGdprExportReturn {
    /** Trigger full data export — downloads JSON. Throws on auth/network error. */
    readonly exportAll: () => Promise<void>;
    /** True while the export is in progress. */
    readonly isExporting: boolean;
}

export function useGdprExport(): UseGdprExportReturn {
    const [isExporting, setIsExporting] = useState(false);

    // Primitive selectors — stable references, no cascade risk
    const userId = useAuthStore((s) => s.user?.id);
    const userEmail = useAuthStore((s) => s.user?.email ?? '');
    const userName = useAuthStore((s) => s.user?.name ?? '');

    const exportAll = useCallback(async () => {
        if (!userId) {
            throw new Error(strings.settings.reAuthRequired);
        }

        setIsExporting(true);
        try {
            const payload = await fetchAllUserData(userId, { id: userId, email: userEmail, name: userName });
            const json = JSON.stringify(payload, null, 2);
            const timestamp = new Date().toISOString().slice(0, 10);
            downloadAsFile(json, `actionstation-export-${timestamp}.json`, 'application/json');
            trackSettingsChanged('gdpr_data_export', 'triggered');
        } finally {
            setIsExporting(false);
        }
    }, [userId, userEmail, userName]);

    return { exportAll, isExporting };
}
