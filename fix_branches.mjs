import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const branchFixMap = {
  'ME': 'ME/MECH',
  'CE': 'CE/CIVIL',
  'EE': 'EE/EEE',
  'BT': 'Biotech'
};

async function fixSupabase() {
  console.log("Fixing Supabase branches...");
  for (const [oldBranch, newBranch] of Object.entries(branchFixMap)) {
    const { data, error } = await supabase
      .from('students')
      .update({ branch: newBranch })
      .eq('branch', oldBranch)
      .select('id');
      
    if (error) {
      console.error(`Error updating ${oldBranch}:`, error);
    } else {
      console.log(`Updated ${data.length} students from ${oldBranch} to ${newBranch}`);
    }
  }
}

function fixLocalFile() {
  const studentsPath = 'C:/Users/pc/Desktop/vertex/vertex/src/data/students.ts';
  console.log(`Fixing local file: ${studentsPath}`);
  let content = fs.readFileSync(studentsPath, 'utf8');
  
  // replace exact string matches in the file
  content = content.replace(/branch: 'ME'/g, "branch: 'ME/MECH'");
  content = content.replace(/branch: 'CE'/g, "branch: 'CE/CIVIL'");
  content = content.replace(/branch: 'EE'/g, "branch: 'EE/EEE'");
  content = content.replace(/branch: 'BT'/g, "branch: 'Biotech'");
  
  fs.writeFileSync(studentsPath, content, 'utf8');
  console.log("Local file updated.");
}

async function run() {
  await fixSupabase();
  fixLocalFile();
}

run();
