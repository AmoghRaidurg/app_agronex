#!/usr/bin/env node
/** Extended runtime QA against production Supabase contracts. */
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

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: FARMER_EMAIL,
    password: FARMER_PASS,
  });
  if (authErr || !authData.session) {
    record('Auth login', false, authErr?.message);
    writeReport();
    process.exit(1);
  }
  const userId = authData.user.id;
  record('Auth login', true, userId);

  // Products ordering (marketplace)
  const { error: sortErr } = await supabase
    .from('products')
    .select('id')
    .gt('quantity', 0)
    .order('created_at', { ascending: false })
    .limit(1);
  record('Products order by created_at', !sortErr, sortErr?.message || 'ok');

  // Order items nested select
  const { data: orderNest, error: nestErr } = await supabase
    .from('orders')
    .select('id, order_items(*)')
    .eq('buyerId', userId)
    .limit(1);
  record('Orders nested order_items', !nestErr, nestErr?.message || `rows=${orderNest?.length ?? 0}`);

  // Seller order_items lookup
  const { data: sellerItems, error: siErr } = await supabase
    .from('order_items')
    .select('orderId')
    .eq('farmerId', userId)
    .limit(1);
  record('Order items by farmerId', !siErr, siErr?.message || `items=${sellerItems?.length ?? 0}`);

  // checkout_order RPC exists (dry run with empty cart should error gracefully, not "function not found")
  const { error: checkoutErr } = await supabase.rpc('checkout_order', { cart: [] });
  const checkoutExists =
    checkoutErr &&
    !checkoutErr.message.includes('Could not find the function') &&
    !checkoutErr.message.includes('schema cache');
  record(
    'checkout_order RPC exists',
    checkoutExists,
    checkoutErr?.message || 'unexpected success on empty cart',
  );

  // payment_intents uses user_id (verified against production)
  const { error: piErr } = await supabase
    .from('payment_intents')
    .select('id, status')
    .eq('user_id', userId)
    .limit(1);
  record('payment_intents filter by user_id', !piErr, piErr?.message || 'ok');

  // Profile join used in marketplace
  const { data: prod } = await supabase.from('products').select('id').gt('quantity', 0).limit(1).maybeSingle();
  if (prod?.id) {
    const { error: joinErr } = await supabase
      .from('products')
      .select('*, profiles:seller_id (name)')
      .eq('id', prod.id)
      .single();
    record('Product profiles join', !joinErr, joinErr?.message || 'ok');
  } else {
    record('Product profiles join', false, 'no product to test');
  }

  await supabase.auth.signOut();
  writeReport();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  writeFileSync(
    'scripts/runtime-qa-result.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2),
  );
}

main().catch((e) => {
  record('Unhandled', false, e.message);
  writeReport();
  process.exit(1);
});
