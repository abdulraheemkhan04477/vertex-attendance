import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpqfrwligcoqtnethnbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XMyJURxUkY6-RmfuNBesMA_6--Ie6II';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ocrDataPath = 'C:/Users/pc/.gemini/antigravity-ide/brain/5838a80a-1416-4294-b2b1-3c314b8a4ef5/scratch/students_ocr.txt';
const ocrText = fs.readFileSync(ocrDataPath, 'utf8');
const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

let currentBranchCode = '';
let currentBranchName = '';

const branchMap = {
  'AIML': 'Artificial Intelligence and Machine Learning',
  'CIVIL': 'Civil Engineering',
  'CSD': 'Computer Science and Design',
  'CSE': 'Computer Science and Engineering',
  'EE': 'Electrical Engineering',
  'IT': 'Information Technology',
  'MECHANICAL': 'Mechanical Engineering',
  'BIOTECH': 'Biotechnology',
  'BIOTECHNOLOGY': 'Biotechnology'
};

const shortBranchMap = {
  'AIML': 'AI/ML',
  'CIVIL': 'CE',
  'CSD': 'CSD',
  'CSE': 'CS/CSE',
  'EE': 'EE',
  'IT': 'IT',
  'MECHANICAL': 'ME',
  'BIOTECH': 'BT',
  'BIOTECHNOLOGY': 'BT'
};

const rowsToInsert = [];

for (const line of lines) {
  const branchHeaderMatch = line.match(/^([A-Z]+)\s*\(Code:\s*(\d+)\)/i);
  if (branchHeaderMatch) {
    currentBranchName = branchHeaderMatch[1].toUpperCase();
    currentBranchCode = branchHeaderMatch[2];
    continue;
  }

  const studentMatch = line.match(/^(\d+)\s+(2[34]\d{11})\s+(.+)$/);
  if (studentMatch) {
    const rollNumber = studentMatch[2];
    let studentName = studentMatch[3].trim();
    studentName = studentName.replace(/\s+$/, '');

    if (!currentBranchName) continue;

    const dept = branchMap[currentBranchName] || currentBranchName;
    const shortBranch = shortBranchMap[currentBranchName] || currentBranchName;
    const year = '4th Year';
    const semester = 'Sem 7';
    const enrollmentYear = rollNumber.startsWith('23') ? '2023' : '2024';

    rowsToInsert.push({
      id: `${Date.now()}-${rollNumber}`,
      roll_number: rollNumber,
      name: studentName,
      department: dept,
      semester: semester,
      year: year,
      branch: shortBranch,
      email: `${rollNumber}@vertex.edu`,
      phone: '9876543210',
      dob: '2003-01-01',
      address: 'Lucknow, UP',
      guardian_name: 'Father',
      guardian_phone: '9876543211',
      password: rollNumber,
      enrollment_year: enrollmentYear,
      section: 'A',
      updated_at: new Date().toISOString()
    });
  }
}

async function run() {
  console.log(`Prepared ${rowsToInsert.length} students to push to Supabase.`);
  
  // To avoid duplicates, we can just fetch existing roll numbers in Supabase first
  const { data: existingData, error: fetchErr } = await supabase.from('students').select('roll_number');
  if (fetchErr) {
    console.error("Error fetching existing students:", fetchErr);
    return;
  }

  const existingRolls = new Set(existingData.map(r => r.roll_number));
  console.log(`Found ${existingRolls.size} existing students in Supabase.`);

  const newRows = rowsToInsert.filter(r => !existingRolls.has(r.roll_number));
  console.log(`Will insert ${newRows.length} new students.`);

  if (newRows.length === 0) {
    console.log("No new students to insert.");
    return;
  }

  // Insert in batches of 100
  for (let i = 0; i < newRows.length; i += 100) {
    const batch = newRows.slice(i, i + 100);
    const { error: insertErr } = await supabase.from('students').insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch ${i}:`, insertErr);
    } else {
      console.log(`Inserted batch ${i} to ${i + batch.length}`);
    }
  }

  console.log("Push to Supabase complete.");
}

run();
