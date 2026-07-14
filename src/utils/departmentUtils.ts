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
    case 'biotechnology':
      return 'biotech';
      
    case 'aiml':
    case 'ai':
    case 'artificialintelligence':
    case 'artificialintelligencemachinelearning':
    case 'aimachinelearning':
      return 'aiml';
      
    default:
      return normalized;
  }
}

export function isSameDepartment(dept1: string | undefined, dept2: string | undefined, branch2?: string | undefined): boolean {
  if (!dept1) return false;
  
  const norm1 = normalizeDepartment(dept1);
  const norm2 = normalizeDepartment(dept2);
  const normBranch2 = branch2 ? normalizeDepartment(branch2) : '';
  
  return norm1 === norm2 || (!!normBranch2 && norm1 === normBranch2);
}
