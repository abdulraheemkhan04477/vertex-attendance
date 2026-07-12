export function normalizeDepartment(dept: string | undefined): string {
  if (!dept) return '';
  
  const normalized = dept.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Standardize common department abbreviations and full names
  if (normalized.includes('ec') || normalized.includes('electronics') || normalized.includes('communication')) {
    return 'ece';
  }
  if (normalized.includes('cs') || normalized.includes('computer')) {
    return 'cse';
  }
  if (normalized.includes('me') || normalized.includes('mechanical')) {
    return 'mech';
  }
  if (normalized.includes('ce') || normalized.includes('civil')) {
    return 'civil';
  }
  if (normalized.includes('ee') || normalized.includes('electrical')) {
    return 'eee';
  }
  if (normalized.includes('it') || normalized.includes('information')) {
    return 'it';
  }
  if (normalized.includes('bio')) {
    return 'biotech';
  }
  if (normalized.includes('ai') || normalized.includes('artificial')) {
    return 'aiml';
  }
  
  return normalized;
}

export function isSameDepartment(dept1: string | undefined, dept2: string | undefined, branch2?: string | undefined): boolean {
  if (!dept1) return false;
  
  const norm1 = normalizeDepartment(dept1);
  const norm2 = normalizeDepartment(dept2);
  const normBranch2 = branch2 ? normalizeDepartment(branch2) : '';
  
  return norm1 === norm2 || (!!normBranch2 && norm1 === normBranch2);
}
