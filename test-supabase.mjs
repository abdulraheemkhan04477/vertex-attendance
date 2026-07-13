import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching students...");
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error("Fetch error:", error);
  } else {
    console.log("Fetch success:", data);
  }

  console.log("Attempting to insert a fake student...");
  const fakeStudent = {
    id: "test-" + Date.now(),
    roll_number: "TEST-001",
    name: "Test Student",
    updated_at: new Date().toISOString()
  };
  
  const { data: insertData, error: insertError } = await supabase.from('students').insert(fakeStudent).select();
  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Insert success:", insertData);
    
    // Cleanup
    await supabase.from('students').delete().eq('id', fakeStudent.id);
  }
}

test();
