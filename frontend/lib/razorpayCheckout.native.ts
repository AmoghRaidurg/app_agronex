// @ts-ignore — native-only module; not bundled on web
import RazorpayCheckout from 'react-native-razorpay';
import type { TopUpOrderResponse } from './razorpayWallet';

export async function openRazorpayCheckout(
  order: TopUpOrderResponse,
  userEmail: string | undefined,
  userName: string | undefined,
  userPhone: string | undefined,
): Promise<void> {
  const options = {
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
  };

  return new Promise((resolve, reject) => {
    RazorpayCheckout.open(options)
      .then(() => resolve())
      .catch((error: { description?: string }) => {
        reject(new Error(error.description || 'Payment failed or cancelled'));
      });
  });
}
