import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await supabase.from('students').select('*');
  if (error) {
    console.error(error);
    return;
  }
  fs.writeFileSync('existing_students.json', JSON.stringify(data, null, 2));
  console.log('Saved to existing_students.json');
}

main();
