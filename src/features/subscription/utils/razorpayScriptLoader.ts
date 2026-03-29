/**
 * Razorpay Checkout.js script loader — shared utility for loading the client-side SDK.
 * Loaded once, cached for subsequent calls.
 */

/** Razorpay Checkout.js types */
export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    handler: (response: RazorpaySuccessResponse) => void;
    prefill?: { name?: string; email?: string };
    theme?: { color?: string };
    modal?: { ondismiss?: () => void };
}

export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface RazorpayCheckout {
    open: () => void;
    close: () => void;
}

export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayCheckout;

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}

/** Load Razorpay Checkout.js script once. Returns a promise that resolves when loaded. */
let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
    if (scriptPromise) return scriptPromise;
    if (window.Razorpay) {
        scriptPromise = Promise.resolve();
        return scriptPromise;
    }

    scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.head.appendChild(script);
    });

    return scriptPromise;
}
