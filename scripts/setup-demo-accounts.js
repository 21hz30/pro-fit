import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.PRO_FIT_DEMO_PASSWORD;
if (!url || !key || !password || password.length < 8) throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PRO_FIT_DEMO_PASSWORD (8+ characters) on the server.');
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const accounts = [
  { email: 'demo-coach@pro-fit.app', display_name: 'Coach Ben', role: 'coach' },
  { email: 'demo-athlete@pro-fit.app', display_name: 'Michael', role: 'trainee' },
];
const existing = [];
for (let page = 1; ; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error(error.message);
  existing.push(...data.users);
  if (data.users.length < 100) break;
}
for (const account of accounts) {
  let user = existing.find((row) => row.email === account.email);
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({ email: account.email, password, email_confirm: true, user_metadata: { display_name: account.display_name } });
    if (error) throw new Error(error.message);
    user = data.user;
  }
  const { data, error } = await client.from('profiles').update({ role: account.role, display_name: account.display_name }).eq('id', user.id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Profile was not created. Apply migrations first.');
  console.log(`Ready: ${account.display_name} (${account.email}). Existing passwords are unchanged.`);
}
