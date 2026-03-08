import { create } from 'zustand';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface ConfirmState {
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
}

interface ConfirmActions {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    handleConfirm: () => void;
    handleCancel: () => void;
}

export type ConfirmStore = ConfirmState & ConfirmActions;

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    isOpen: false,
    options: null,
    resolve: null,

    confirm: (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            set({
                isOpen: true,
                options,
                resolve,
            });
        });
    },

    handleConfirm: () => {
        const { resolve } = get();
        if (resolve) {
            resolve(true);
        }
        set({
            isOpen: false,
            options: null,
            resolve: null,
        });
    },

    handleCancel: () => {
        const { resolve } = get();
        if (resolve) {
            resolve(false);
        }
        set({
            isOpen: false,
            options: null,
            resolve: null,
        });
    },
}));

/**
 * Convenient accessor to get the confirm trigger function.
 *
 * @note Despite the `use` prefix this is NOT a React hook \u2014 it contains no
 * hook calls internally and does not establish a subscription.  It is safe to
 * call outside of component render (e.g. in other hooks\u2019 useCallback bodies).
 * Named with the `use` prefix only to signal that its return value is a
 * stable reference obtained from a Zustand store.
 */
export const useConfirm = () => {
    return useConfirmStore.getState().confirm;
};
