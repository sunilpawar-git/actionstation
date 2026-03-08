/**
 * Toast Container Component - Renders notifications
 */
import { useToastStore } from '../stores/toastStore';
import styles from './Toast.module.css';

export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    const handleRemove = (id: string) => {
        useToastStore.getState().removeToast(id);
    };

    return (
        <div className={styles.container}>
            {toasts.map((t) => (
                <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                    <span className={styles.message}>{t.message}</span>
                    {t.action && (
                        <button
                            className={styles.action}
                            onClick={() => { t.action!.onClick(); handleRemove(t.id); }}
                        >
                            {t.action.label}
                        </button>
                    )}
                    <button
                        className={styles.close}
                        onClick={() => handleRemove(t.id)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
