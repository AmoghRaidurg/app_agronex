import { Platform } from 'react-native';
import { supabase } from './supabase';

export { openRazorpayCheckout } from './razorpayCheckout';

export interface TopUpOrderResponse {
  key_id: string;
  order_id: string;
  amount_paise: number;
  currency: string;
  intent_id: string;
  receipt_number: string;
}

export async function createWalletTopUpOrder(amountInr: number): Promise<TopUpOrderResponse> {
  const platform = Platform.OS === 'web' ? 'web' : 'android';
  const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
    body: { amount_inr: amountInr, platform },
  });
  if (error) throw error;
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
  }
  return data as TopUpOrderResponse;
}

export async function pollWalletAfterPayment(
  userId: string,
  intentId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 30;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const status = await readPaymentIntentStatus(intentId, userId);
    if (status === 'paid') return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function readPaymentIntentStatus(intentId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('status')
    .eq('id', intentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!error && data?.status) return data.status as string;
  return null;
}
