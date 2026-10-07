import type { FeeStructure, FeePayment, Student, StudentFeeSummary, User } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { studentsDB, usersDB, authDB } from './db';
import { isSameDepartment, normalizeDepartment } from '../utils/departmentUtils';

const KEYS = {
  FEE_STRUCTURES: 'vertex_fee_structures',
  FEE_PAYMENTS: 'vertex_fee_payments',
} as const;

const memoryCache: Record<string, any> = {};

function getItem<T>(key: string): T[] {
  if (memoryCache[key]) return memoryCache[key] as T[];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    memoryCache[key] = parsed;
    return parsed;
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  memoryCache[key] = data;
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateReceiptNo(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${dateStr}-${rand}`;
}

// ─── Default Initial Seed Data ────────────────────────────────────────────────
const INITIAL_FEE_STRUCTURES: FeeStructure[] = [
  {
    id: 'fs-1',
    course: 'B.Tech',
    branch: 'EC/ECE',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Tuition Fee',
    amount: 45000,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-2',
    course: 'B.Tech',
    branch: 'EC/ECE',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Examination Fee',
    amount: 2500,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-3',
    course: 'B.Tech',
    branch: 'CS/CSE',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Tuition Fee',
    amount: 50000,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-4',
    course: 'B.Tech',
    branch: 'CS/CSE',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Examination Fee',
    amount: 2500,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-5',
    course: 'B.Tech',
    branch: 'ME/MECH',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Tuition Fee',
    amount: 42000,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-6',
    course: 'B.Tech',
    branch: 'CE/CIVIL',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Tuition Fee',
    amount: 42000,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fs-7',
    course: 'B.Tech',
    branch: 'EE',
    year: '1st Year',
    semester: 'Sem 1',
    feeType: 'Tuition Fee',
    amount: 44000,
    dueDate: '2026-11-30',
    academicSession: '2024-2025',
    createdBy: 'super-admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Current User Helper ─────────────────────────────────────────────────────
function getCurrentUserRoleAndDept(): { user: User | null; role: string; department?: string } {
  const token = authDB.getToken();
  if (token) {
    const user = usersDB.getById(token);
    if (user) {
      return { user, role: user.role, department: user.department };
    }
  }
  return { user: null, role: '' };
}

// ─── Fee Structure Operations ────────────────────────────────────────────────
export const feeStructuresDB = {
  getAll(): FeeStructure[] {
    let items = getItem<FeeStructure>(KEYS.FEE_STRUCTURES);
    if (items.length === 0) {
      items = INITIAL_FEE_STRUCTURES;
      setItem(KEYS.FEE_STRUCTURES, items);
    }
    return items;
  },

  getByBranch(branch: string): FeeStructure[] {
    const norm = normalizeDepartment(branch);
    return this.getAll().filter(fs => normalizeDepartment(fs.branch) === norm || fs.branch === 'All');
  },

  getByClass(year: string, branch: string, semester: string): FeeStructure[] {
    const normBranch = normalizeDepartment(branch);
    return this.getAll().filter(fs =>
      (fs.year === year || fs.year === 'All') &&
      (normalizeDepartment(fs.branch) === normBranch || fs.branch === 'All') &&
      (fs.semester === semester || fs.semester === 'All')
    );
  },

  add(structure: Omit<FeeStructure, 'id' | 'createdAt' | 'updatedAt'>): FeeStructure {
    const { role } = getCurrentUserRoleAndDept();
    if (role !== 'superadmin' && role !== 'college_admin') {
      throw new Error('Unauthorized: Only Super Admin and College Admin can create fee structures.');
    }

    const all = this.getAll();
    const now = new Date().toISOString();
    const newStructure: FeeStructure = {
      ...structure,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    all.push(newStructure);
    setItem(KEYS.FEE_STRUCTURES, all);
    this.syncToCloud(all);
    window.dispatchEvent(new Event('local-storage'));
    return newStructure;
  },

  update(id: string, updates: Partial<FeeStructure>): void {
    const { role } = getCurrentUserRoleAndDept();
    if (role !== 'superadmin' && role !== 'college_admin') {
      throw new Error('Unauthorized: Only Super Admin and College Admin can edit fee structures.');
    }

    const all = this.getAll();
    const idx = all.findIndex(fs => fs.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
      setItem(KEYS.FEE_STRUCTURES, all);
      this.syncToCloud(all);
      window.dispatchEvent(new Event('local-storage'));
    }
  },

  delete(id: string): void {
    const { role } = getCurrentUserRoleAndDept();
    if (role !== 'superadmin' && role !== 'college_admin') {
      throw new Error('Unauthorized: Only Super Admin and College Admin can delete fee structures.');
    }

    const all = this.getAll();
    const filtered = all.filter(fs => fs.id !== id);
    setItem(KEYS.FEE_STRUCTURES, filtered);
    this.syncToCloud(filtered);
    window.dispatchEvent(new Event('local-storage'));
  },

  syncToCloud(list: FeeStructure[]): void {
    if (isSupabaseConfigured && supabase) {
      supabase.from('fee_structures').upsert(list, { onConflict: 'id' }).then(({ error }) => {
        if (error) {
          // Fallback sync to app_settings if dedicated table not created
          supabase!.from('app_settings').upsert({ key: 'fee_structures', value: list });
        }
      });
    }
  },
};

// ─── Fee Payments Operations ─────────────────────────────────────────────────
export const feePaymentsDB = {
  getAll(): FeePayment[] {
    return getItem<FeePayment>(KEYS.FEE_PAYMENTS);
  },

  getByStudentId(studentId: string): FeePayment[] {
    return this.getAll().filter(p => p.studentId === studentId);
  },

  getByRollNumber(rollNumber: string): FeePayment[] {
    return this.getAll().filter(p => p.rollNumber === rollNumber);
  },

  getByBranch(branch: string): FeePayment[] {
    const norm = normalizeDepartment(branch);
    return this.getAll().filter(p => normalizeDepartment(p.branch) === norm);
  },

  getByClass(year: string, branch: string, semester: string): FeePayment[] {
    const normBranch = normalizeDepartment(branch);
    return this.getAll().filter(p =>
      p.year === year &&
      normalizeDepartment(p.branch) === normBranch &&
      p.semester === semester
    );
  },

  collect(paymentData: Omit<FeePayment, 'id' | 'createdAt' | 'updatedAt' | 'receiptNo'>): FeePayment {
    const { role, department } = getCurrentUserRoleAndDept();
    
    // Role check: Only SuperAdmin, Admin, and HOD can collect fee
    if (role !== 'superadmin' && role !== 'college_admin' && role !== 'hod') {
      throw new Error('Unauthorized: Only Super Admin, Admin, and HOD can collect fees.');
    }

    // HOD scope check: HOD can only collect for students in their own branch
    if (role === 'hod' && department) {
      if (!isSameDepartment(department, paymentData.branch, paymentData.branch)) {
        throw new Error(`Unauthorized: HOD can only collect fees for students in ${department} department.`);
      }
    }

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount. Amount must be greater than 0.');
    }

    const all = this.getAll();
    const now = new Date().toISOString();
    const newPayment: FeePayment = {
      ...paymentData,
      id: generateId(),
      receiptNo: generateReceiptNo(),
      createdAt: now,
      updatedAt: now,
    };

    all.push(newPayment);
    setItem(KEYS.FEE_PAYMENTS, all);
    this.syncToCloud(all);
    window.dispatchEvent(new Event('local-storage'));
    return newPayment;
  },

  update(id: string, updates: Partial<FeePayment>): void {
    const { role } = getCurrentUserRoleAndDept();
    if (role !== 'superadmin' && role !== 'college_admin') {
      throw new Error('Unauthorized: Only Super Admin and Admin can edit existing payments.');
    }

    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
      setItem(KEYS.FEE_PAYMENTS, all);
      this.syncToCloud(all);
      window.dispatchEvent(new Event('local-storage'));
    }
  },

  delete(id: string): void {
    const { role } = getCurrentUserRoleAndDept();
    if (role !== 'superadmin' && role !== 'college_admin') {
      throw new Error('Unauthorized: Only Super Admin and Admin can delete payment records.');
    }

    const all = this.getAll();
    const filtered = all.filter(p => p.id !== id);
    setItem(KEYS.FEE_PAYMENTS, filtered);
    this.syncToCloud(filtered);
    window.dispatchEvent(new Event('local-storage'));
  },

  syncToCloud(list: FeePayment[]): void {
    if (isSupabaseConfigured && supabase) {
      supabase.from('fee_payments').upsert(list, { onConflict: 'id' }).then(({ error }) => {
        if (error) {
          // Fallback sync to app_settings if dedicated table not created
          supabase!.from('app_settings').upsert({ key: 'fee_payments', value: list });
        }
      });
    }
  },
};

// ─── Authoritative Summary & Metric Calculations ────────────────────────────
export function getStudentFeeSummary(student: Student): StudentFeeSummary {
  const normBranch = normalizeDepartment(student.branch || student.department);
  
  // Find applicable fee structures for student's branch, year, semester
  const allStructures = feeStructuresDB.getAll();
  const applicableStructures = allStructures.filter(fs => {
    const fsBranch = normalizeDepartment(fs.branch);
    const branchMatch = fsBranch === normBranch || fs.branch === 'All';
    const yearMatch = fs.year === student.year || fs.year === 'All';
    const semMatch = fs.semester === student.semester || fs.semester === 'All';
    return branchMatch && yearMatch && semMatch;
  });

  // Calculate total fee expected
  const totalFee = applicableStructures.reduce((sum, fs) => sum + (fs.amount || 0), 0);

  // Calculate total paid fee
  const payments = feePaymentsDB.getByStudentId(student.id).concat(
    feePaymentsDB.getByRollNumber(student.rollNumber).filter(p => p.studentId !== student.id)
  );

  const paidFee = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingFee = Math.max(0, totalFee - paidFee);

  let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (paidFee >= totalFee && totalFee > 0) {
    status = 'Paid';
  } else if (paidFee > 0) {
    status = 'Partial';
  }

  const sortedPayments = [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  const lastPaymentDate = sortedPayments.length > 0 ? sortedPayments[0].paymentDate : undefined;

  return {
    student,
    totalFee,
    paidFee,
    pendingFee,
    status,
    lastPaymentDate,
  };
}

// ─── Cloud Hydration ──────────────────────────────────────────────────────────
export async function syncFeesFromCloud(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // 1. Pull fee structures
    const { data: fsRows, error: fsErr } = await supabase.from('fee_structures').select('*');
    if (!fsErr && fsRows && fsRows.length > 0) {
      setItem(KEYS.FEE_STRUCTURES, fsRows as FeeStructure[]);
    } else {
      // Fallback check in app_settings
      const { data: appRow } = await supabase.from('app_settings').select('value').eq('key', 'fee_structures').maybeSingle();
      if (appRow && appRow.value && Array.isArray(appRow.value)) {
        setItem(KEYS.FEE_STRUCTURES, appRow.value as FeeStructure[]);
      }
    }

    // 2. Pull fee payments
    const { data: fpRows, error: fpErr } = await supabase.from('fee_payments').select('*');
    if (!fpErr && fpRows && fpRows.length > 0) {
      setItem(KEYS.FEE_PAYMENTS, fpRows as FeePayment[]);
    } else {
      // Fallback check in app_settings
      const { data: appRow } = await supabase.from('app_settings').select('value').eq('key', 'fee_payments').maybeSingle();
      if (appRow && appRow.value && Array.isArray(appRow.value)) {
        setItem(KEYS.FEE_PAYMENTS, appRow.value as FeePayment[]);
      }
    }
  } catch (err) {
    console.warn('[FeesDB] Cloud sync failed, using cached storage:', err);
  }
}
