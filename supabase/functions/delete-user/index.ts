// Deploy with: npx supabase functions deploy delete-user
// Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in function environment.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !secret) return new Response(JSON.stringify({ error: 'Server configuration missing' }), { status: 500, headers });
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers });
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers });
  const admin = createClient(url, secret);
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', authData.user.id).single();
  if (profileError || profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Administrator access required' }), { status: 403, headers });
  let userId: string;
  try { const body = await req.json(); userId = body.userId; } catch { return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers }); }
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(userId) || userId === authData.user.id) return new Response(JSON.stringify({ error: 'Invalid target user' }), { status: 400, headers });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
});
