import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: students } = await supabase.from('students').select('branch').limit(500);
  console.log("Branches in students table:", [...new Set(students.map(s => s.branch))]);
  
  const { data: appSettings } = await supabase.from('app_settings').select('value').eq('key', 'users');
  if (appSettings && appSettings.length > 0) {
    const users = appSettings[0].value;
    const teachers = users.filter(u => u.role === 'teacher');
    console.log("Teacher assigned branches:", JSON.stringify(teachers.map(t => ({ name: t.name, username: t.username, branches: t.assignedClasses?.map(c => c.branch) }))));
  }
}

test();
