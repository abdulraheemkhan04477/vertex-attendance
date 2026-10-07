export function normalizeDepartment(dept: string | undefined): string {
  if (!dept) return '';
  
  const normalized = dept.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact matches based on normalized alphanumeric strings to prevent overlap
  switch (normalized) {
    case 'ece':
    case 'ec':
    case 'ecece':
    case 'electronics':
    case 'electronicsandcommunication':
    case 'electronicscommunication':
    case 'electronicsandcommunicationengineering':
    case 'electronicscommunicationengineering':
      return 'ece';
      
    case 'cse':
    case 'cs':
    case 'cscse':
    case 'computer':
    case 'computerscience':
    case 'computerscienceengineering':
    case 'computerscienceandengineering':
      return 'cse';
      
    case 'csd':
    case 'computersciencedesign':
    case 'computerscienceanddesign':
    case 'computersciencedesignengineering':
      return 'csd';
      
    case 'mech':
    case 'me':
    case 'memech':
    case 'mechanical':
    case 'mechanicalengineering':
      return 'mech';
      
    case 'civil':
    case 'ce':
    case 'cecivil':
    case 'civilengineering':
      return 'civil';
      
    case 'ee':
    case 'eee':
    case 'eeeee':
    case 'electrical':
    case 'electricalengineering':
    case 'electricalandelectronics':
    case 'electricalelectronicsengineering':
    case 'electricalandelectronicsengineering':
      return 'ee';
      
    case 'it':
    case 'informationtechnology':
      return 'it';
      
    case 'biotech':
    case 'bio':
    case 'bt':
    case 'biotechnology':
      return 'biotech';
      
    case 'aiml':
    case 'ai':
    case 'artificialintelligence':
    case 'artificialintelligencemachinelearning':
    case 'aimachinelearning':
      return 'aiml';
      
    case 'common':
    case 'commonsubjects':
    case 'all':
    case 'allbranches':
      return 'common';

    default:
      return normalized;
  }
}

export function normalizeSemester(sem: string | undefined): string {
  if (!sem) return '';
  const clean = sem.trim().toLowerCase();
  if (clean.includes('1st') || clean.includes('sem 1') || clean.includes('sem1') || clean === '1' || clean.includes('first')) return 'Sem 1';
  if (clean.includes('2nd') || clean.includes('sem 2') || clean.includes('sem2') || clean === '2' || clean.includes('second')) return 'Sem 2';
  if (clean.includes('3rd') || clean.includes('sem 3') || clean.includes('sem3') || clean === '3' || clean.includes('third')) return 'Sem 3';
  if (clean.includes('4th') || clean.includes('sem 4') || clean.includes('sem4') || clean === '4' || clean.includes('fourth')) return 'Sem 4';
  if (clean.includes('5th') || clean.includes('sem 5') || clean.includes('sem5') || clean === '5' || clean.includes('fifth')) return 'Sem 5';
  if (clean.includes('6th') || clean.includes('sem 6') || clean.includes('sem6') || clean === '6' || clean.includes('sixth')) return 'Sem 6';
  if (clean.includes('7th') || clean.includes('sem 7') || clean.includes('sem7') || clean === '7' || clean.includes('seventh')) return 'Sem 7';
  if (clean.includes('8th') || clean.includes('sem 8') || clean.includes('sem8') || clean === '8' || clean.includes('eighth')) return 'Sem 8';
  return sem;
}

export function isSameDepartment(dept1: string | undefined, dept2: string | undefined, branch2?: string | undefined): boolean {
  if (!dept1) return false;
  
  const norm1 = normalizeDepartment(dept1);
  const norm2 = normalizeDepartment(dept2);
  const normBranch2 = branch2 ? normalizeDepartment(branch2) : '';

  if (norm1 === 'common' || norm2 === 'common' || normBranch2 === 'common') return true;
  
  return norm1 === norm2 || (!!normBranch2 && norm1 === normBranch2);
}

