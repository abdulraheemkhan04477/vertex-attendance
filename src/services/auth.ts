import { authDB, studentsDB, usersDB } from './db';
import type { Student, User } from '../types';
import { useStore } from '../store/useStore';

export const authService = {
  getAdminPassword(): string {
    const user = this.getCurrentUser();
    if (user) return user.password || '';
    return localStorage.getItem('vertex_admin_pwd') || 'ABDUL1234';
  },

  getLastPasswordChange(): string | null {
    return localStorage.getItem('vertex_admin_pwd_changed');
  },

  updateAdminPassword(newPassword: string): void {
    const lastChanged = new Date().toISOString();
    localStorage.setItem('vertex_admin_pwd', newPassword);
    localStorage.setItem('vertex_admin_pwd_changed', lastChanged);
    authDB.syncAdminAuth(newPassword, lastChanged);
    
    const user = this.getCurrentUser();
    if (user) {
      usersDB.update(user.id, { password: newPassword });
    }
  },

  login(username: string, password: string): boolean {
    const user = usersDB.getByUsername(username.trim());
    if (user && user.password === password && user.isActive) {
      authDB.setToken(user.id);
      useStore.getState().setCurrentUser(user);
      if (user.role === 'superadmin') {
        useStore.getState().setActiveCollegeId('ALL');
      } else {
        useStore.getState().setActiveCollegeId(user.collegeId || 'default-college');
      }
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearToken();
    useStore.getState().setCurrentUser(null);
    useStore.getState().setActiveCollegeId(null);
  },

  isAuthenticated(): boolean {
    const token = authDB.getToken();
    // Support legacy token fallback for college admin temporarily if needed
    if (token === 'vertex_admin_v1') return true; 
    return !!token && !!usersDB.getById(token);
  },

  getCurrentUser(): User | null {
    const token = authDB.getToken();
    if (!token) return null;
    // Map legacy token to college_admin
    if (token === 'vertex_admin_v1') {
      return usersDB.getById('college-admin-1') || null;
    }
    return usersDB.getById(token) || null;
  }
};

export const studentAuthService = {
  login(rollNumber: string, password: string): boolean {
    const student = studentsDB.getByRollNumber(rollNumber);
    if (student && student.password === password) {
      authDB.setStudentToken(rollNumber);
      useStore.getState().setActiveCollegeId(student.collegeId || 'default-college');
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearStudentToken();
    useStore.getState().setActiveCollegeId(null);
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
