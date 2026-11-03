import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnkldnopljxbmsoofhzh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uXYNtz2MZIyMVq04x59F1Q_ndA-3Zcw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRpc() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('rpc exec_sql error:', error);
  console.log('rpc exec_sql data:', data);

  const { data: d2, error: e2 } = await supabase.rpc('execute_sql', { sql: 'SELECT 1;' });
  console.log('rpc execute_sql error:', e2);
}

testRpc();
