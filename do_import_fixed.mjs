import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

import fs from 'fs';

async function main() {
  console.log('Fetching existing students...');
  const { data: existingStudents, error: fetchError } = await supabase.from('students').select('*');
  if (fetchError) {
    console.error('Error fetching students:', fetchError);
    return;
  }
  
  const existingMap = new Map();
  existingStudents.forEach(s => existingMap.set(s.roll_number, s));
  
  console.log(`Found ${existingMap.size} existing students in DB.`);

  const rawScript = fs.readFileSync('push_to_supabase.mjs', 'utf8');
  const matchRawData = rawScript.match(/const RAW_DATA = `([\s\S]*?)`;/);
  if (!matchRawData) {
    console.error('Could not extract RAW_DATA');
    return;
  }
  const RAW_DATA = matchRawData[1];

  const lines = RAW_DATA.split('\n');
  const updates = [];
  let currentBranchName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const branchHeaderMatch = trimmed.match(/^([A-Za-z\s]+)\s*\(Code:/i);
    if (branchHeaderMatch) {
      currentBranchName = branchHeaderMatch[1].toUpperCase().trim();
      continue;
    }
    
    if (trimmed.startsWith('S.No.') || trimmed.startsWith('Student List') || trimmed.startsWith('Total Students')) continue;

    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})$/);
    if (match) {
      const rollNumber = match[2];
      const rest = match[3];
      const dobStr = match[4]; 
      
      const [dd, mm, yyyy] = dobStr.split('/');
      const formattedDob = `${yyyy}-${mm}-${dd}`;

      const existing = existingMap.get(rollNumber);
      
      let finalName = '';
      let finalFather = '';
      
      if (existing && existing.name && rest.toUpperCase().startsWith(existing.name.toUpperCase())) {
        finalName = existing.name;
        finalFather = rest.substring(existing.name.length).trim();
      } else {
        const parts = rest.split(' ');
        if (parts.length >= 4) {
          finalName = parts.slice(0, 2).join(' ');
          finalFather = parts.slice(2).join(' ');
        } else if (parts.length === 3) {
          finalName = parts.slice(0, 2).join(' ');
          finalFather = parts.slice(2).join(' ');
        } else {
          finalName = rest;
          finalFather = '';
        }
      }

      let mappedBranch = existing ? existing.branch : currentBranchName;
      if (currentBranchName === 'AIML') mappedBranch = 'AI/ML';
      else if (currentBranchName === 'BIOTECH') mappedBranch = 'BT';
      else if (currentBranchName === 'CIVIL') mappedBranch = 'CE';
      else if (currentBranchName === 'CSD') mappedBranch = 'CSD';
      else if (currentBranchName === 'CSE') mappedBranch = 'CS/CSE';
      else if (currentBranchName === 'ECE') mappedBranch = 'EC/ECE';
      else if (currentBranchName === 'EE') mappedBranch = 'EE';
      else if (currentBranchName === 'IT') mappedBranch = 'IT';
      else if (currentBranchName === 'MECHANICAL') mappedBranch = 'ME';

      const updateData = {
        name: finalName,
        father_name: finalFather,
        dob: formattedDob,
        branch: mappedBranch,
        roll_number: rollNumber // include roll_number!
      };

      if (existing) {
        updates.push({
          id: existing.id,
          ...updateData
        });
      }
    }
  }

  console.log(`Found ${updates.length} updates.`);
  
  let successCount = 0;
  let errorCount = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    // We can just use update if we have the id. But upsert works if we provide the whole row?
    // Let's use update iteratively to avoid full row requirement for upsert, or upsert with id.
    const { error } = await supabase.from('students').upsert(batch);
    if (error) {
      console.error(`Error updating batch ${i}:`, error);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }

  console.log(`Completed. Successfully updated ${successCount} students. Errors: ${errorCount}`);
}

main();
