/**
 * Seed Auth users + profiles via Supabase Admin API.
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/seed-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEED_USERS = [
  { name: 'Admin', phone: '+919999999999', role: 'admin', status: 'offline' },
  { name: 'John Plumber', phone: '+919876543210', role: 'plumber', status: 'offline' },
  { name: 'Mike Plumber', phone: '+919876543211', role: 'plumber', status: 'offline' },
  { name: 'Sarah Plumber', phone: '+919876543212', role: 'plumber', status: 'offline' },
];

async function upsertSeedUser(admin, user) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existing = listed.users.find((u) => u.phone === user.phone);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      phone: user.phone,
      phone_confirm: true,
      user_metadata: { name: user.name, role: user.role },
    });

    if (error) {
      throw error;
    }

    userId = data.user.id;
    console.log(`Created auth user: ${user.name} (${user.phone})`);
  } else {
    console.log(`Auth user exists: ${user.name} (${user.phone})`);
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      name: user.name,
      phone_number: user.phone,
      role: user.role,
      status: user.status,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw profileError;
  }

  console.log(`Upserted profile: ${user.name} (${user.role})`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of SEED_USERS) {
    await upsertSeedUser(admin, user);
  }

  console.log('\nSeed complete. Login with phone + OTP (E.164 or 10-digit local):');
  console.log('  Admin:   9999999999  (+919999999999)');
  console.log('  Plumber: 9876543210, 9876543211, 9876543212');
}

main().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});
