import { authDB, studentsDB } from './db';
import type { Student } from '../types';

const ADMIN_USERNAME = 'vertex';
const DEFAULT_ADMIN_PASSWORD = 'ABDUL1234';
const TOKEN_VALUE = 'vertex_admin_v1';

export const authService = {
  getAdminPassword(): string {
    return localStorage.getItem('vertex_admin_pwd') || DEFAULT_ADMIN_PASSWORD;
  },

  getLastPasswordChange(): string | null {
    return localStorage.getItem('vertex_admin_pwd_changed');
  },

  updateAdminPassword(newPassword: string): void {
    const lastChanged = new Date().toISOString();
    localStorage.setItem('vertex_admin_pwd', newPassword);
    localStorage.setItem('vertex_admin_pwd_changed', lastChanged);
    authDB.syncAdminAuth(newPassword, lastChanged);
  },

  login(username: string, password: string): boolean {
    if (username.trim() === ADMIN_USERNAME && password === this.getAdminPassword()) {
      authDB.setToken(TOKEN_VALUE);
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearToken();
  },

  isAuthenticated(): boolean {
    return authDB.getToken() === TOKEN_VALUE;
  },
};

export const studentAuthService = {
  login(rollNumber: string, password: string): boolean {
    const student = studentsDB.getByRollNumber(rollNumber);
    if (student && student.password === password) {
      authDB.setStudentToken(rollNumber);
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearStudentToken();
  },

  isAuthenticated(): boolean {
    return !!authDB.getStudentToken();
  },

  getCurrentStudent(): Student | null {
    const rollNumber = authDB.getStudentToken();
    if (!rollNumber) return null;
    return studentsDB.getByRollNumber(rollNumber) || null;
  },

  async getFreshCurrentStudent(): Promise<Student | null> {
    const rollNumber = authDB.getStudentToken();
    if (!rollNumber) return null;
    
    // We import these dynamically to avoid circular dependencies and TS require errors
    const { isSupabaseConfigured, supabase } = await import('./supabase');
    const { studentsDB } = await import('./db');
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('roll_number', rollNumber)
          .maybeSingle();
          
        if (data && !error) {
          // rowToStudent mapping inline since it's private in db.ts
          const freshStudent: Student = {
            id: data.id,
            rollNumber: data.roll_number,
            name: data.name,
            department: data.department || '',
            semester: data.semester || '',
            year: data.year || '',
            branch: data.branch || '',
            email: data.email || '',
            phone: data.phone || '',
            dob: data.dob || '',
            address: data.address || '',
            guardianName: data.guardian_name || '',
            guardianPhone: data.guardian_phone || '',
            fatherName: data.father_name || undefined,
            motherName: data.mother_name || undefined,
            gender: data.gender || undefined,
            profilePhoto: data.profile_photo || undefined,
            password: data.password || '',
            enrollmentYear: data.enrollment_year || '',
            section: data.section || '',
          };
          
          const existing = studentsDB.getAll();
          const index = existing.findIndex((s: Student) => s.rollNumber === rollNumber);
          if (index >= 0) {
            existing[index] = freshStudent;
            localStorage.setItem('vertex_students', JSON.stringify(existing));
            window.dispatchEvent(new Event('local-storage')); // trigger updates
          }
          return freshStudent;
        }
      } catch (e) {
        console.error('[AUTH] Failed to fetch fresh student:', e);
      }
    }
    return this.getCurrentStudent();
  }
};
