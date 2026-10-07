import { authDB, studentsDB, usersDB } from './db';
import type { Student, User } from '../types';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured, supabase } from './supabase';

export const authService = {
  getLastPasswordChange(): string | null {
    return localStorage.getItem('vertex_admin_pwd_changed');
  },

  login(username: string, password: string): boolean {
    const uName = username.trim();
    const pWord = password.trim();
    const user = usersDB.getByUsername(uName);
    if (user && user.password.trim() === pWord && user.isActive) {
      authDB.setToken(user.id);
      useStore.getState().setCurrentUser(user);
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearToken();
    useStore.getState().setCurrentUser(null);
  },

  isAuthenticated(): boolean {
    const token = authDB.getToken();
    return !!token && !!usersDB.getById(token);
  },

  getCurrentUser(): User | null {
    const token = authDB.getToken();
    if (!token) return null;
    return usersDB.getById(token) || null;
  }
};

export function normalizeDob(val: string): string {
  if (!val) return '';
  const cleaned = val.trim().replace(/[.\-\/]/g, ' ');
  const parts = cleaned.split(/\s+/);
  if (parts.length === 3) {
    let day = '', month = '', year = '';
    if (parts[0].length === 4) {
      // YYYY MM DD
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else if (parts[2].length === 4) {
      // DD MM YYYY
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
    }
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return val.trim();
}

export const studentAuthService = {
  async login(rollNumber: string, dobInput: string): Promise<boolean> {
    const normRoll = rollNumber.trim().toUpperCase();
    const normInputDob = normalizeDob(dobInput);

    if (!normRoll || !normInputDob) return false;

    // Check cloud if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .ilike('roll_number', normRoll)
          .maybeSingle();

        if (data && !error) {
          const dbDob = normalizeDob(data.dob || '');
          if (dbDob && dbDob === normInputDob) {
            authDB.setStudentToken(data.roll_number);
            return true;
          } else {
            return false;
          }
        }
      } catch (e) {
        console.error('[STUDENT AUTH] Supabase check error:', e);
      }
    }

    // Fallback/Local check
    const student = studentsDB.getAll().find((s) => s.rollNumber.trim().toUpperCase() === normRoll);
    if (student) {
      const dbDob = normalizeDob(student.dob || '');
      if (dbDob && dbDob === normInputDob) {
        authDB.setStudentToken(student.rollNumber);
        return true;
      }
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('roll_number', rollNumber)
          .maybeSingle();
          
        if (data && !error) {
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
            window.dispatchEvent(new Event('local-storage'));
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
