#!/usr/bin/env node
/** Verify Android app backend contracts against production Supabase. */
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
process.chdir(ROOT);

function loadEnv() {
  const env = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const FARMER_EMAIL = 'commerce.verify.farmer@example.com';
const FARMER_PASS = 'CommerceTest!123';

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!url || !key) {
  record('Environment', false, 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  record('Production Supabase URL configured', url.includes('supabase.co'), url.replace(/https:\/\//, ''));

  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, name, quantity, price_per_unit')
    .gt('quantity', 0)
    .limit(5);
  record('Marketplace products query', !productsErr, productsErr?.message || `${products?.length ?? 0} listings`);

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: FARMER_EMAIL,
    password: FARMER_PASS,
  });
  record('Login (commerce.verify.farmer)', !authErr && !!authData.session, authErr?.message || authData.user?.id);

  if (!authData.session) {
    writeReport();
    process.exit(1);
  }

  const userId = authData.user.id;

  const { data: sessionData } = await supabase.auth.getSession();
  record('Session restoration', !!sessionData.session?.access_token, 'getSession after sign-in');

  const { data: userRow, error: userErr } = await supabase.from('users').select('uid, role, walletBalance').eq('uid', userId).single();
  record('Users table / profile row', !userErr && !!userRow, userErr?.message || `role=${userRow?.role}`);
  record('Wallet balance (users.walletBalance)', !userErr && userRow != null, `balance=${userRow?.walletBalance ?? 0}`);

  const { data: hist, error: histErr } = await supabase
    .from('wallet_history')
    .select('id, type, amount, createdAt')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(5);
  record('Wallet history', !histErr, histErr?.message || `${hist?.length ?? 0} entries`);

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, totalAmount, status')
    .eq('buyerId', userId)
    .limit(5);
  record('Orders (buyer)', !ordersErr, ordersErr?.message || `${orders?.length ?? 0} orders`);

  const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('razorpay-create-order', {
    body: { amount_inr: 100, platform: 'android' },
  });
  const edgeOk = !edgeErr && !edgeData?.error && !!edgeData?.order_id;
  record(
    'Edge razorpay-create-order',
    edgeOk,
    edgeErr?.message || edgeData?.error || (edgeOk ? `intent=${edgeData.intent_id}` : JSON.stringify(edgeData)),
  );

  const productId = products?.[0]?.id;
  if (productId) {
    const { data: detail, error: detailErr } = await supabase
      .from('products')
      .select('*, profiles:seller_id(name)')
      .eq('id', productId)
      .single();
    record('Product details', !detailErr && !!detail, detailErr?.message || detail?.name);
  } else {
    record('Product details', false, 'No product available to test');
  }

  await supabase.auth.signOut();
  const { data: afterSignOut } = await supabase.auth.getSession();
  record('Sign out clears session', !afterSignOut.session, 'session null after signOut');

  writeReport();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  const out = {
    timestamp: new Date().toISOString(),
    supabase_host: url?.replace(/https:\/\//, ''),
    results,
    pass: results.filter((r) => r.ok).length,
    fail: results.filter((r) => !r.ok).length,
  };
  writeFileSync('scripts/android-backend-verify-result.json', JSON.stringify(out, null, 2));
}

main().catch((e) => {
  record('Unhandled error', false, e.message);
  writeReport();
  process.exit(1);
});
