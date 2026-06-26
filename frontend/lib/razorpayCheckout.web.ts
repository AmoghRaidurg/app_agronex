import type { TopUpOrderResponse } from './razorpayWallet';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay is only available in a browser'));
  }
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  order: TopUpOrderResponse,
  userEmail: string | undefined,
  userName: string | undefined,
  userPhone: string | undefined,
): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout is unavailable');
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'AgroElevate',
      description: `Wallet top-up · ${order.receipt_number}`,
      order_id: order.order_id,
      prefill: {
        email: userEmail || '',
        contact: userPhone || '',
        name: userName || '',
      },
      theme: { color: '#16a34a' },
      handler: () => resolve(),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}
