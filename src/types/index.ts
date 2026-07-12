// ── Interfaces ─────────────────────────────────────────────────
export interface College {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  department: string;
  semester: string;
  collegeId?: string; // Links student to a college
  // Extended academic fields
  year: string;        // '1st Year' | '2nd Year' | '3rd Year' | '4th Year'
  branch: string;      // 'EC/ECE' | 'CS/CSE' | etc.
  // Personal details
  email: string;
  phone: string;
  dob: string;         // YYYY-MM-DD
  address: string;
  guardianName: string;
  guardianPhone: string;
  fatherName?: string;   // Father's name
  motherName?: string;   // Mother's name
  gender?: string;       // Male, Female, Other
  profilePhoto?: string; // base64 data URL
  // Portal auth
  password: string;    // default = rollNumber
  // Meta
  enrollmentYear: string; // e.g. '2023'
  section: string;     // 'A' | 'B' | 'C'
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  collegeId?: string;
  date: string;
  subject?: string;       // stores academic context: "3rd Year|EC/ECE|Sem 6|General"
  faculty: string;
  lectureNumber: number;
  status: AttendanceStatus;
  remarks: string;
  timestamp: string;
  // Academic structure fields (optional, for new records)
  year?: string;
  branch?: string;
  semesterNum?: string;
}


export interface QrSession {
  id: string;
  collegeId?: string;
  year: string;
  branch: string;
  semester: string;
  lectureNumber: number;
  date: string;
  expiresAt: string;
  createdBy: string;
}

export type UserRole = 'superadmin' | 'college_admin' | 'hod' | 'teacher';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  collegeId?: string;
  // Role-specific fields
  email?: string;
  department?: string; // For HODs and Teachers
  assignedClasses?: Array<{ year: string; branch: string; semester: string; section?: string }>; // For Teachers
  isActive: boolean;
  createdAt: string;
}

export interface AppSettings {
  instituteName: string;
  department: string;
  semester: string;
  facultyName: string;
  theme: 'light' | 'dark';
  collegeId?: string;
  // Branding
  logoUrl?: string;
  collegeLogo?: string;
  loginLogo?: string;
  dashboardLogo?: string;
  collegeEmail?: string;
  contactNumber?: string;
  website?: string;
  address?: string;
  supportEmail?: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
}

export interface StudentAttendanceStats {
  student: Student;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ── Academic Structure ───────────────────────────────────────────
export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;
export type Year = typeof YEARS[number];

export const BRANCHES = [
  'EC/ECE',
  'CS/CSE',
  'ME/MECH',
  'CE/CIVIL',
  'EE/EEE',
  'IT',
  'Biotech',
  'CSD',
  'AI/ML',
] as const;
export type Branch = typeof BRANCHES[number];

export const SEMESTERS_BY_YEAR: Record<string, string[]> = {
  '1st Year': ['Sem 1', 'Sem 2'],
  '2nd Year': ['Sem 3', 'Sem 4'],
  '3rd Year': ['Sem 5', 'Sem 6'],
  '4th Year': ['Sem 7', 'Sem 8'],
};

// Legacy constant removed, subjects are now loaded from the database per branch/semester.


export interface AcademicSelection {
  year: string;
  branch: string;
  semester: string;
  lectureNumber: number;
}

// Subject types removed, dynamically managed via database instead.

// ── Status constants ──────────────────────────────────────────────
export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  absent:  'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  late:    'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  leave:   'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
};

export const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: 'bg-green-500',
  absent:  'bg-red-500',
  late:    'bg-yellow-500',
  leave:   'bg-blue-500',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent:  'Absent',
  late:    'Late',
  leave:   'Leave',
};

// Dummy runtime export
export const _typeMarker = true;
