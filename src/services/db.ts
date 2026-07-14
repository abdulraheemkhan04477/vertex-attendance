/**
 * Database Service — Hybrid localStorage (sync) + Supabase (async cloud sync)
 *
 * Architecture:
 *  - localStorage is the synchronous primary store → instant UI reads/writes
 *  - Supabase syncs in the background on every write
 *  - On app start, data is fetched from Supabase and merged into localStorage
 *  - This keeps all existing component code working unchanged (sync API)
 */

import type { Student, AttendanceRecord, AppSettings, User } from '../types';
import { STUDENTS_DATA } from '../data/students';
import { supabase, isSupabaseConfigured } from './supabase';
import { isSameDepartment } from '../utils/departmentUtils';

const KEYS = {
  STUDENTS: 'vertex_students',
  ATTENDANCE: 'vertex_attendance',
  SETTINGS: 'vertex_settings',
  SEEDED: 'vertex_seeded',
  AUTH: 'vertex_auth',
  STUDENT_AUTH: 'vertex_student_auth',
  CLOUD_SYNCED: 'vertex_cloud_synced',
  QR_SESSIONS: 'vertex_qr_sessions',
  USERS: 'vertex_users',
  COLLEGES: 'vertex_colleges',
  LEAVES: 'vertex_leaves',
  SESSIONS: 'vertex_sessions',
} as const;

// ─── Active College Helper ───────────────────────────────────────────────────
export function getActiveCollegeId(): string | null {
  return localStorage.getItem('vertex_active_college');
}

const DEFAULT_SETTINGS: AppSettings = {
  instituteName: 'Vertex Institute of Technology',
  department: 'B.Tech Programs',
  semester: 'B.Tech Academic Year 2024-25',
  facultyName: 'Faculty Name',
  theme: 'light',
  supportEmail: 'zuneydkhan04477@gmail.com',
  whatsappNumber: '+1 234 567 8900',
  language: 'English',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  autoLogoutTimer: 30, // 30 minutes
  dashboardDefaultPage: 'Dashboard',
};

// ─── Local helpers ─────────────────────────────────────────────────────────────
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

function getObject<T>(key: string, defaultValue: T): T {
  if (memoryCache[key]) return memoryCache[key] as T;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T) : defaultValue;
    memoryCache[key] = parsed;
    return parsed;
  } catch {
    return defaultValue;
  }
}

function setObject<T>(key: string, data: T): void {
  memoryCache[key] = data;
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Supabase row mappers ────────────────────────────────────────────────────
function rowToStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    rollNumber: row.roll_number as string,
    name: row.name as string,
    department: (row.department as string) || '',
    semester: (row.semester as string) || '',
    year: (row.year as string) || '',
    branch: (row.branch as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    dob: (row.dob as string) || '',
    address: (row.address as string) || '',
    guardianName: (row.guardian_name as string) || '',
    guardianPhone: (row.guardian_phone as string) || '',
    fatherName: (row.father_name as string) || undefined,
    motherName: (row.mother_name as string) || undefined,
    gender: (row.gender as string) || undefined,
    profilePhoto: (row.profile_photo as string) || undefined,
    password: (row.password as string) || '',
    enrollmentYear: (row.enrollment_year as string) || '',
    section: (row.section as string) || '',
  };
}

function studentToRow(s: Partial<Student> & { id?: string; rollNumber?: string }) {
  return {
    ...(s.id !== undefined && { id: s.id }),
    // Removed college_id to fix schema mismatch with Supabase
    ...(s.rollNumber !== undefined && { roll_number: s.rollNumber }),
    ...(s.name !== undefined && { name: s.name }),
    ...(s.department !== undefined && { department: s.department }),
    ...(s.semester !== undefined && { semester: s.semester }),
    ...(s.year !== undefined && { year: s.year }),
    ...(s.branch !== undefined && { branch: s.branch }),
    ...(s.email !== undefined && { email: s.email }),
    ...(s.phone !== undefined && { phone: s.phone }),
    ...(s.dob !== undefined && { dob: s.dob }),
    ...(s.address !== undefined && { address: s.address }),
    ...(s.guardianName !== undefined && { guardian_name: s.guardianName }),
    ...(s.guardianPhone !== undefined && { guardian_phone: s.guardianPhone }),
    ...(s.fatherName !== undefined && { father_name: s.fatherName }),
    ...(s.motherName !== undefined && { mother_name: s.motherName }),
    ...(s.gender !== undefined && { gender: s.gender }),
    ...(s.profilePhoto !== undefined && { profile_photo: s.profilePhoto }),
    ...(s.password !== undefined && { password: s.password }),
    ...(s.enrollmentYear !== undefined && { enrollment_year: s.enrollmentYear }),
    ...(s.section !== undefined && { section: s.section }),
    updated_at: new Date().toISOString(),
  };
}

function rowToAttendance(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: row.id as string,
    studentId: (row.student_id as string) || '',
    rollNumber: row.roll_number as string,
    studentName: (row.student_name as string) || '',
    date: row.date as string,
    subject: row.subject as string,
    faculty: (row.faculty as string) || '',
    lectureNumber: (row.lecture_number as number) || 1,
    status: row.status as AttendanceRecord['status'],
    remarks: (row.remarks as string) || '',
    timestamp: (row.timestamp as string) || new Date().toISOString(),
    year: row.year as string | undefined,
    branch: row.branch as string | undefined,
    semesterNum: row.semester_num as string | undefined,
  };
}

function attendanceToRow(r: Partial<AttendanceRecord> & { id?: string }) {
  return {
    ...(r.id !== undefined && { id: r.id }),
    // Removed college_id to fix schema mismatch with Supabase
    ...(r.studentId !== undefined && { student_id: r.studentId }),
    ...(r.rollNumber !== undefined && { roll_number: r.rollNumber }),
    ...(r.studentName !== undefined && { student_name: r.studentName }),
    ...(r.date !== undefined && { date: r.date }),
    ...(r.subject !== undefined && { subject: r.subject }),
    ...(r.faculty !== undefined && { faculty: r.faculty }),
    ...(r.lectureNumber !== undefined && { lecture_number: r.lectureNumber }),
    ...(r.status !== undefined && { status: r.status }),
    ...(r.remarks !== undefined && { remarks: r.remarks }),
    ...(r.timestamp !== undefined && { timestamp: r.timestamp }),
    ...(r.year !== undefined && { year: r.year }),
    ...(r.branch !== undefined && { branch: r.branch }),
    ...(r.semesterNum !== undefined && { semester_num: r.semesterNum }),
  };
}

// ─── Cloud sync bootstrap ────────────────────────────────────────────────────
export async function syncFromCloud(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    let baseStudents: Student[] = [];
    const { data: studentRows, error: se } = await supabase.from('students').select('*');
    if (!se && studentRows && studentRows.length > 0) {
      baseStudents = studentRows.map(rowToStudent);
    }

    let baseAttendance: AttendanceRecord[] = [];
    const { data: attRows, error: ae } = await supabase.from('attendance_records').select('*');
    if (!ae && attRows) {
      baseAttendance = attRows.map(rowToAttendance);
    }

    const { data: settingsRows, error: ste } = await supabase.from('app_settings').select('*');
    if (!ste && settingsRows) {
      const getObj = (key: string) => settingsRows.find(r => r.key === key)?.value;

      const settingsObj = getObj('settings');
      if (settingsObj) setObject<AppSettings>(KEYS.SETTINGS, settingsObj as AppSettings);

      const leavesObj = getObj('leaves');
      if (leavesObj) setItem(KEYS.LEAVES || 'vertex_leaves', leavesObj as any[]);

      const sessionsObj = getObj('sessions');
      if (sessionsObj) setItem(KEYS.SESSIONS || 'vertex_sessions', sessionsObj as any[]);

      const collegesObj = getObj('colleges');
      if (collegesObj) setItem(KEYS.COLLEGES, collegesObj as any[]);

      const usersObj = getObj('users');
      if (usersObj) setItem(KEYS.USERS, usersObj as any[]);

      const localStudents = getItem<Student>(KEYS.STUDENTS) || [];
      const localAtt = getItem<AttendanceRecord>(KEYS.ATTENDANCE) || [];

      const studentsObj = getObj('students') as Student[] | undefined;
      if (studentsObj) {
        const studentMap = new Map();
        baseStudents.forEach(s => {
          const loc = localStudents.find(ls => ls.id === s.id);
          studentMap.set(s.id, s);
        });
        studentsObj.forEach(s => studentMap.set(s.id, s));
        setItem(KEYS.STUDENTS, Array.from(studentMap.values()));
      } else if (baseStudents.length > 0) {
        baseStudents.forEach(s => {
          const loc = localStudents.find(ls => ls.id === s.id);
        });
        setItem(KEYS.STUDENTS, baseStudents);
      }

      const attendanceObj = getObj('attendance') as AttendanceRecord[] | undefined;
      if (attendanceObj) {
        const attMap = new Map();
        baseAttendance.forEach(a => {
          const loc = localAtt.find(la => la.id === a.id);
          attMap.set(a.id, a);
        });
        attendanceObj.forEach(a => attMap.set(a.id, a));
        setItem(KEYS.ATTENDANCE, Array.from(attMap.values()));
      } else if (baseAttendance.length > 0) {
        baseAttendance.forEach(a => {
          const loc = localAtt.find(la => la.id === a.id);
        });
        setItem(KEYS.ATTENDANCE, baseAttendance);
      }
    } else if (baseStudents.length > 0 || baseAttendance.length > 0) {
      // Fallback if settings fails but base succeeded
      const localStudents = getItem<Student>(KEYS.STUDENTS) || [];
      const localAtt = getItem<AttendanceRecord>(KEYS.ATTENDANCE) || [];
      
      if (baseStudents.length > 0) {
        baseStudents.forEach(s => {
          const loc = localStudents.find(ls => ls.id === s.id);
        });
        setItem(KEYS.STUDENTS, baseStudents);
      }
      if (baseAttendance.length > 0) {
        baseAttendance.forEach(a => {
          const loc = localAtt.find(la => la.id === a.id);
        });
        setItem(KEYS.ATTENDANCE, baseAttendance);
      }
    }

    // Pull admin auth
    const { data: authRows, error: authe } = await supabase.from('app_settings').select('*').eq('key', 'admin_auth').maybeSingle();
    if (!authe && authRows && authRows.value) {
      const authVal = authRows.value as { password?: string; lastChanged?: string };
      if (authVal.password) localStorage.setItem('vertex_admin_pwd', authVal.password);
      if (authVal.lastChanged) localStorage.setItem('vertex_admin_pwd_changed', authVal.lastChanged);
    }

    // Pull QR sessions
    const { data: qrRows, error: qrErr } = await supabase.from('qr_sessions').select('*');
    if (!qrErr && qrRows) {
      const formatted = qrRows.map(r => ({
        id: r.id,
        year: r.year,
        branch: r.branch,
        semester: r.semester,
        lectureNumber: r.lecture_number,
        date: r.date,
        expiresAt: r.expires_at,
        createdBy: r.created_by,
      }));
      setItem(KEYS.QR_SESSIONS, formatted);
    }

    localStorage.setItem(KEYS.CLOUD_SYNCED, 'true');
  } catch (err) {
    console.warn('[DB] Cloud sync failed, using localStorage:', err);
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
export function seedDatabase(): void {
  if (!localStorage.getItem(KEYS.SEEDED)) {
    setItem<Student>(KEYS.STUDENTS, STUDENTS_DATA);
    setObject<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
    
    // Seed initial users
    const initialUsers: User[] = [];
    
    // Check for super admin credentials from environment variables (avoid hardcoding)
    const envSuperUsername = import.meta.env.VITE_SUPERADMIN_USERNAME;
    const envSuperPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD;
    
    if (envSuperUsername && envSuperPassword) {
      initialUsers.push({
        id: 'super-admin-1',
        username: envSuperUsername,
        password: envSuperPassword,
        role: 'superadmin',
        name: 'System Owner',
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    initialUsers.push(
      {
        id: 'college-admin-1',
        username: 'vertex',
        password: import.meta.env.VITE_COLLEGE_ADMIN_PASSWORD || '', // Legacy admin password
        role: 'college_admin',
        name: 'College Admin',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    );
    setItem<User>(KEYS.USERS, initialUsers);
    
    localStorage.setItem(KEYS.SEEDED, 'true');
  } else {
    // Migration: ensure superadmin and college_admin exist
    let users = getItem<User>(KEYS.USERS);

    let changed = false;

    if (!users.some(u => u.role === 'superadmin')) {
      const envSuperUsername = import.meta.env.VITE_SUPERADMIN_USERNAME;
      const envSuperPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD;
      
      if (envSuperUsername && envSuperPassword) {
        users.push({
          id: 'super-admin-1',
          username: envSuperUsername,
          password: envSuperPassword,
          role: 'superadmin',
          name: 'System Owner',
          isActive: true,
          createdAt: new Date().toISOString()
        });
        changed = true;
      }
    } else {
      // If superadmin exists, ensure it syncs with env vars if provided
      const envSuperUsername = import.meta.env.VITE_SUPERADMIN_USERNAME;
      const envSuperPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD;
      
      if (envSuperUsername && envSuperPassword) {
        const superAdmin = users.find(u => u.role === 'superadmin');
        if (superAdmin && (superAdmin.username !== envSuperUsername || superAdmin.password !== envSuperPassword)) {
          superAdmin.username = envSuperUsername;
          superAdmin.password = envSuperPassword;
          changed = true;
        }
      }
    }

    if (!users.some(u => u.role === 'college_admin')) {
      const legacyPwd = localStorage.getItem('vertex_admin_pwd') || 'ABDUL1234';
      users.push({
        id: 'college-admin-1',
        username: 'vertex',
        password: legacyPwd,
        role: 'college_admin',
        name: 'College Admin',
        isActive: true,
        createdAt: new Date().toISOString()
      });
      changed = true;
    }
    
    if (changed) {
      setItem<User>(KEYS.USERS, users);
    }


  }
}

// ─── Users (Staff) ────────────────────────────────────────────────────────────
export const usersDB = {
  getAll(): User[] {
    let items = getItem<User>(KEYS.USERS);
    return items;
  },

  getById(id: string): User | undefined {
    return this.getAll().find((u) => u.id === id);
  },

  getByUsername(username: string): User | undefined {
    return this.getAll().find((u) => u.username === username);
  },

  add(user: Omit<User, 'id'>): User {
    const all = getItem<User>(KEYS.USERS); // Use un-filtered for adding
    const newUser = { 
      ...user, 
      id: generateId(),
    };
    all.push(newUser);
    setItem<User>(KEYS.USERS, all);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'users', value: all }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase insert user error:', error.message);
      });
    }
    return newUser;
  },

  update(id: string, updates: Partial<User>): void {
    if (id === 'super-admin-1' && updates.role && updates.role !== 'superadmin') {
      console.warn('[DB] Cannot change role of permanent super admin');
      return;
    }
    const all = getItem<User>(KEYS.USERS);
    const idx = all.findIndex((u) => u.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setItem<User>(KEYS.USERS, all);
      if (isSupabaseConfigured && supabase) {
        supabase.from('app_settings').upsert({ key: 'users', value: all }).then(({ error }) => {
          if (error) console.warn('[DB] Supabase update user error:', error.message);
        });
      }
    }
  },

  delete(id: string): void {
    if (id === 'super-admin-1') {
      console.warn('[DB] Cannot delete permanent super admin');
      return;
    }
    const all = getItem<User>(KEYS.USERS);
    const filtered = all.filter((u) => u.id !== id);
    setItem<User>(KEYS.USERS, filtered);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'users', value: filtered }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase delete user error:', error.message);
      });
    }
  },
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsDB = {
  getAll(): Student[] {
    let items = getItem<Student>(KEYS.STUDENTS);
    
    // Backend-level enforcement of HOD filtering
    const token = authDB.getToken();
    if (token) {
      const currentUser = usersDB.getById(token);
      if (currentUser?.role === 'hod' && currentUser.department) {
        items = items.filter((s) => isSameDepartment(currentUser.department, s.department, s.branch));
      }
    }
    
    return items;
  },

  getById(id: string): Student | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  getByRollNumber(rollNumber: string): Student | undefined {
    return this.getAll().find((s) => s.rollNumber === rollNumber);
  },

  add(student: Omit<Student, 'id'>): Student {
    const all = getItem<Student>(KEYS.STUDENTS);
    const newStudent = { 
      ...student, 
      id: generateId(),
    };
    all.push(newStudent);
    setItem<Student>(KEYS.STUDENTS, all);
    // Background cloud sync
    if (isSupabaseConfigured && supabase) {
      supabase.from('students').insert(studentToRow(newStudent)).then(({ error }) => {
        if (error) console.warn('[DB] Supabase insert student error:', error.message);
      });
      supabase.from('app_settings').upsert({ key: 'students', value: all }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase app_settings sync student error:', error.message);
      });
    }
    return newStudent;
  },

  update(id: string, updates: Partial<Student>): void {
    const all = getItem<Student>(KEYS.STUDENTS);
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setItem<Student>(KEYS.STUDENTS, all);
      // Background cloud sync
      if (isSupabaseConfigured && supabase) {
        supabase.from('students').update(studentToRow(updates)).eq('id', id).then(({ error }) => {
          if (error) console.warn('[DB] Supabase update student error:', error.message);
        });
        supabase.from('app_settings').upsert({ key: 'students', value: all }).then(({ error }) => {
          if (error) console.warn('[DB] Supabase app_settings sync student error:', error.message);
        });
      }
    }
  },

  delete(id: string): void {
    const all = getItem<Student>(KEYS.STUDENTS);
    const filtered = all.filter((s) => s.id !== id);
    setItem<Student>(KEYS.STUDENTS, filtered);
    // Background cloud sync
    if (isSupabaseConfigured && supabase) {
      supabase.from('students').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('[DB] Supabase delete student error:', error.message);
      });
      supabase.from('app_settings').upsert({ key: 'students', value: filtered }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase app_settings sync student error:', error.message);
      });
    }
  },
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceDB = {
  getAll(): AttendanceRecord[] {
    let items = getItem<AttendanceRecord>(KEYS.ATTENDANCE);
    return items;
  },

  getByDate(date: string): AttendanceRecord[] {
    return this.getAll().filter((r) => r.date === date);
  },

  getByDateAndSubject(date: string, subject: string): AttendanceRecord[] {
    return this.getAll().filter((r) => r.date === date && r.subject === subject);
  },

  getBySession(date: string, subject: string, lectureNumber: number): AttendanceRecord[] {
    return this.getAll().filter(
      (r) => r.date === date && r.subject === subject && r.lectureNumber === lectureNumber,
    );
  },

  getByStudent(rollNumber: string): AttendanceRecord[] {
    return this.getAll().filter((r) => r.rollNumber === rollNumber);
  },

  getByStudentAndDateRange(rollNumber: string, start: string, end: string): AttendanceRecord[] {
    return this.getAll().filter(
      (r) => r.rollNumber === rollNumber && r.date >= start && r.date <= end,
    );
  },

  getByDateRange(start: string, end: string): AttendanceRecord[] {
    return this.getAll().filter((r) => r.date >= start && r.date <= end);
  },

  /** Save a full session — upsert each record (1 per student per session) */
  saveSession(records: Omit<AttendanceRecord, 'id' | 'timestamp'>[]): void {
    const all = getItem<AttendanceRecord>(KEYS.ATTENDANCE);
    const now = new Date().toISOString();
    const upserted: AttendanceRecord[] = [];

    records.forEach((incoming) => {
      const idx = all.findIndex(
        (r) =>
          r.rollNumber === incoming.rollNumber &&
          r.date === incoming.date &&
          r.subject === incoming.subject &&
          r.lectureNumber === incoming.lectureNumber,
      );
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...incoming, timestamp: now };
        upserted.push(all[idx]);
      } else {
        const rec = { 
            ...incoming, 
            id: generateId(), 
            timestamp: now,
        };
        all.push(rec);
        upserted.push(rec);
      }
    });

    setItem<AttendanceRecord>(KEYS.ATTENDANCE, all);

    // Background cloud upsert
    if (isSupabaseConfigured && supabase && upserted.length > 0) {
      supabase.from('attendance_records').upsert(upserted.map(attendanceToRow), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase upsert attendance error:', error.message);
      });
      supabase.from('app_settings').upsert({ key: 'attendance', value: all }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase app_settings sync attendance error:', error.message);
      });
    }
  },

  deleteSession(date: string, subject: string, lectureNumber: number): void {
    const all = this.getAll();
    const toDelete = all.filter(
      (r) => r.date === date && r.subject === subject && r.lectureNumber === lectureNumber,
    );
    const filtered = all.filter(
      (r) => !(r.date === date && r.subject === subject && r.lectureNumber === lectureNumber),
    );
    setItem<AttendanceRecord>(KEYS.ATTENDANCE, filtered);

    // Background cloud delete
    if (isSupabaseConfigured && supabase && toDelete.length > 0) {
      const ids = toDelete.map((r) => r.id);
      supabase.from('attendance_records').delete().in('id', ids).then(({ error }) => {
        if (error) console.warn('[DB] Supabase delete session error:', error.message);
      });
    }
  },

  update(id: string, changes: Partial<AttendanceRecord>): void {
    const all = this.getAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...changes, timestamp: new Date().toISOString() };
      setItem<AttendanceRecord>(KEYS.ATTENDANCE, all);
      // Background cloud sync
      if (isSupabaseConfigured && supabase) {
        supabase.from('attendance_records').update(attendanceToRow(changes)).eq('id', id).then(({ error }) => {
          if (error) console.warn('[DB] Supabase update attendance error:', error.message);
        });
        supabase.from('app_settings').upsert({ key: 'attendance', value: all }).then(({ error }) => {
          if (error) console.warn('[DB] Supabase app_settings sync attendance error:', error.message);
        });
      }
    }
  },

  delete(id: string): void {
    const all = getItem<AttendanceRecord>(KEYS.ATTENDANCE);
    const filtered = all.filter((r) => r.id !== id);
    setItem<AttendanceRecord>(KEYS.ATTENDANCE, filtered);
    // Background cloud delete
    if (isSupabaseConfigured && supabase) {
      supabase.from('attendance_records').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('[DB] Supabase delete attendance error:', error.message);
      });
      supabase.from('app_settings').upsert({ key: 'attendance', value: filtered }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase app_settings sync attendance error:', error.message);
      });
    }
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsDB = {
  get(): AppSettings {
    return getObject<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  save(settings: AppSettings): void {
    setObject<AppSettings>(KEYS.SETTINGS, settings);
    // Background cloud sync
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'settings', value: settings }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase save settings error:', error.message);
      });
    }
  },

  update(partial: Partial<AppSettings>): void {
    const current = this.get();
    this.save({ ...current, ...partial });
  },
};

// ─── Leaves ───────────────────────────────────────────────────────────────────
export const leavesDB = {
  getAll(): import('../types').LeaveRequest[] {
    return getItem<import('../types').LeaveRequest>('vertex_leaves');
  },

  getByStudent(rollNumber: string): import('../types').LeaveRequest[] {
    return this.getAll().filter((l) => l.rollNumber === rollNumber);
  },

  add(leave: Omit<import('../types').LeaveRequest, 'id' | 'status' | 'appliedAt'>): import('../types').LeaveRequest {
    const all = this.getAll();
    const newLeave: import('../types').LeaveRequest = {
      ...leave,
      id: generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };
    all.push(newLeave);
    setItem('vertex_leaves', all);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'leaves', value: all }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase save leaves error:', error.message);
      });
    }
    return newLeave;
  },

  update(id: string, updates: Partial<import('../types').LeaveRequest>): void {
    const all = this.getAll();
    const idx = all.findIndex((l) => l.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setItem('vertex_leaves', all);
      if (isSupabaseConfigured && supabase) {
        supabase.from('app_settings').upsert({ key: 'leaves', value: all }).then(({ error }) => {
          if (error) console.warn('[DB] Supabase update leaves error:', error.message);
        });
      }
    }
  },
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsDB = {
  getAll(): import('../types').Session[] {
    return getItem<import('../types').Session>('vertex_sessions');
  },

  add(session: import('../types').Session): void {
    const all = this.getAll();
    all.push(session);
    setItem('vertex_sessions', all);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'sessions', value: all });
    }
  },

  updateLastActive(id: string): void {
    const all = this.getAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx].lastActive = new Date().toISOString();
      setItem('vertex_sessions', all);
      if (isSupabaseConfigured && supabase) {
        supabase.from('app_settings').upsert({ key: 'sessions', value: all });
      }
    }
  },

  clearAllButCurrent(currentId: string): void {
    const all = this.getAll();
    const filtered = all.filter(s => s.id === currentId);
    setItem('vertex_sessions', filtered);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'sessions', value: filtered });
    }
  },

  delete(id: string): void {
    const all = this.getAll();
    const filtered = all.filter(s => s.id !== id);
    setItem('vertex_sessions', filtered);
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'sessions', value: filtered });
    }
  }
};


// ─── QR Sessions ──────────────────────────────────────────────────────────────
export const qrSessionsDB = {
  getAll(): import('../types').QrSession[] {
    let items = getItem<import('../types').QrSession>(KEYS.QR_SESSIONS);
    return items;
  },

  getById(id: string): import('../types').QrSession | undefined {
    return this.getAll().find(s => s.id === id);
  },

  add(session: import('../types').QrSession): void {
    const all = getItem<import('../types').QrSession>(KEYS.QR_SESSIONS);
    const newSession = {
      ...session,
    };
    all.push(newSession);
    setItem(KEYS.QR_SESSIONS, all);
    if (isSupabaseConfigured && supabase) {
      supabase.from('qr_sessions').insert({
        id: newSession.id,
        subject: `${newSession.year}|${newSession.branch}|${newSession.semester}`,
        year: newSession.year,
        branch: newSession.branch,
        semester: newSession.semester,
        lecture_number: newSession.lectureNumber,
        date: newSession.date,
        expires_at: newSession.expiresAt,
        created_by: newSession.createdBy,
      }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase insert QR session error:', error.message);
      });
    }
  },

  async fetchSessionFromCloud(id: string): Promise<import('../types').QrSession | null> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('[DB] Supabase not configured. Cannot fetch session from cloud.');
      return null;
    }
    const { data, error } = await supabase.from('qr_sessions').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[DB] Supabase fetch error in fetchSessionFromCloud:', error.message);
      return null;
    }
    if (!data) {
      console.warn('[DB] Session not found in cloud.');
      return null;
    }
    
    const session = {
      id: data.id,
      year: data.year,
      branch: data.branch,
      semester: data.semester,
      lectureNumber: data.lecture_number,
      date: data.date,
      expiresAt: data.expires_at,
      createdBy: data.created_by,
    };
    
    // Cache it locally so subsequent lookups are fast
    const all = this.getAll();
    if (!all.find(s => s.id === session.id)) {
      all.push(session);
      setItem(KEYS.QR_SESSIONS, all);
    }
    
    return session;
  },
};


// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authDB = {
  setToken(value: string): void {
    localStorage.setItem(KEYS.AUTH, value);
  },
  getToken(): string | null {
    return localStorage.getItem(KEYS.AUTH);
  },
  clearToken(): void {
    localStorage.removeItem(KEYS.AUTH);
  },

  syncAdminAuth(password: string, lastChanged: string): void {
    if (isSupabaseConfigured && supabase) {
      supabase.from('app_settings').upsert({ key: 'admin_auth', value: { password, lastChanged } }).then(({ error }) => {
        if (error) console.warn('[DB] Supabase sync admin auth error:', error.message);
      });
    }
  },

  // Student Portal Auth
  setStudentToken(rollNumber: string): void {
    localStorage.setItem(KEYS.STUDENT_AUTH, rollNumber);
  },
  getStudentToken(): string | null {
    return localStorage.getItem(KEYS.STUDENT_AUTH);
  },
  clearStudentToken(): void {
    localStorage.removeItem(KEYS.STUDENT_AUTH);
  },
};
