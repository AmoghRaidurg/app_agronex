// Metro resolves razorpayCheckout.native.ts / .web.ts at bundle time.
// This file satisfies TypeScript and serves as the native fallback.
export { openRazorpayCheckout } from './razorpayCheckout.native';
