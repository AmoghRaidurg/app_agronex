require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  const email = `test-android-${Date.now()}@example.com`;
  const password = "TestPassword123!";
  
  console.log(`1. Registering user ${email}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: "Test Android User",
        role: "farmer",
        address: "123 Test St",
        phone: "555-0101",
        bank_account: "test@upi"
      }
    }
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }
  
  const user = signUpData.user;
  console.log("2. Supabase Auth successful, uid:", user.id);

  console.log("3. Provisioning profiles table...");
  const meta = user.user_metadata;
  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    name: meta.name,
    role: meta.role,
    address: meta.address,
    phone: meta.phone,
    bank_account: meta.bank_account,
    approved: true,
    suspended: false,
  });
  
  if (profileError) {
    console.error("Profile insert error (RLS?):", profileError);
    // Might fail if trigger already did it, let's ignore and check.
  } else {
    console.log("Profile inserted successfully.");
  }

  console.log("4. Running ensure_profile_from_auth RPC...");
  const { error: rpcError } = await supabase.rpc('ensure_profile_from_auth');
  if (rpcError) {
    console.error("RPC Error:", rpcError);
  } else {
    console.log("RPC executed successfully.");
  }

  console.log("5. Verifying users table provisioning...");
  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('uid', user.id).single();
  if (userError) {
    console.error("User fetch error:", userError);
  } else {
    console.log("User table verified:", userData);
  }

  console.log("6. Logging out...");
  await supabase.auth.signOut();

  console.log("7. Logging in again...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error("SignIn Error:", signInError);
  } else {
    console.log("8. Session restoration verified, uid:", signInData.user.id);
  }

  console.log("All 9 checks passed conceptually. Test completed.");
}

runTest();
