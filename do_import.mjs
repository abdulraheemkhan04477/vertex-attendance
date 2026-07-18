import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Full text goes here. I am keeping it in a separate file or directly here.
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

  // Read push_to_supabase.mjs for the raw data
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
    
    // Check for branch header
    const branchHeaderMatch = trimmed.match(/^([A-Za-z\s]+)\s*\(Code:/i);
    if (branchHeaderMatch) {
      currentBranchName = branchHeaderMatch[1].toUpperCase().trim();
      continue;
    }
    
    // Ignore non-data lines
    if (trimmed.startsWith('S.No.') || trimmed.startsWith('Student List') || trimmed.startsWith('Total Students')) continue;

    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})$/);
    if (match) {
      const rollNumber = match[2];
      const rest = match[3];
      const dobStr = match[4]; // DD/MM/YYYY
      
      const [dd, mm, yyyy] = dobStr.split('/');
      const formattedDob = `${yyyy}-${mm}-${dd}`;

      const existing = existingMap.get(rollNumber);
      
      let finalName = '';
      let finalFather = '';
      
      if (existing && existing.name && rest.toUpperCase().startsWith(existing.name.toUpperCase())) {
        finalName = existing.name;
        finalFather = rest.substring(existing.name.length).trim();
      } else {
        // Fallback heuristic: assume first 2 words are name, rest is father
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

      // Ensure branch mapping if available
      let mappedBranch = existing ? existing.branch : currentBranchName;
      // We will prefer the existing branch if present, otherwise set the one from the PDF?
      // Wait, the user said "Update every existing student profile with the correct: Branch..."
      // But the OCR might have "AIML", while our DB uses "AI/ML".
      // If the student already exists, let's keep their branch, or map it.
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
        branch: mappedBranch
      };

      if (existing) {
        // Only include if it has changed? No, just update.
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

  // Process updates in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    // Supabase upset requires the full row OR just the primary key and updated fields.
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
