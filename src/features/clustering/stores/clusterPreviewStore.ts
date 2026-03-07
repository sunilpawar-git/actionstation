/** Cluster preview store — transient UI state for cluster suggestion flow */
import { create } from 'zustand';
import type { ClusterGroup } from '../types/cluster';

export type ClusterPhase = 'idle' | 'computing' | 'labeling' | 'preview';

interface ClusterPreviewState {
    phase: ClusterPhase;
    previewGroups: readonly ClusterGroup[] | null;
    setPhase: (phase: ClusterPhase) => void;
    setPreview: (groups: readonly ClusterGroup[]) => void;
    reset: () => void;
}

export const useClusterPreviewStore = create<ClusterPreviewState>()((set) => ({
    phase: 'idle',
    previewGroups: null,
    setPhase: (phase) => set({ phase }),
    setPreview: (groups) => set({ phase: 'preview', previewGroups: groups }),
    reset: () => set({ phase: 'idle', previewGroups: null }),
}));
