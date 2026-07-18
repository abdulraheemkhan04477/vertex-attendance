import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  await supabase.from('app_settings').delete().eq('key', 'students');
  console.log('Stale students cache removed from Supabase app_settings.');
}

main();
