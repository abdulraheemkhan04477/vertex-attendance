// ── Interfaces ─────────────────────────────────────────────────
export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  department: string;
  semester: string;
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
  date: string;
  subject: string;       // stores academic context: "3rd Year|EC/ECE|Sem 6|Digital Communication"
  faculty: string;
  lectureNumber: number;
  status: AttendanceStatus;
  remarks: string;
  timestamp: string;
  // Academic structure fields (optional, for new records)
  year?: string;
  branch?: string;
  semesterNum?: string;
  subjectName?: string;
}

export interface AppSettings {
  instituteName: string;
  department: string;
  semester: string;
  facultyName: string;
  theme: 'light' | 'dark';
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
  'CH/CHEM',
  'AI/ML',
] as const;
export type Branch = typeof BRANCHES[number];

export const SEMESTERS_BY_YEAR: Record<string, string[]> = {
  '1st Year': ['Sem 1', 'Sem 2'],
  '2nd Year': ['Sem 3', 'Sem 4'],
  '3rd Year': ['Sem 5', 'Sem 6'],
  '4th Year': ['Sem 7', 'Sem 8'],
};

export const SUBJECTS_BY_SEMESTER: Record<string, Record<string, string[]>> = {
  'Sem 1': {
    default: ['Mathematics-I', 'Physics', 'Chemistry', 'English', 'Basic Electronics', 'Engineering Drawing'],
  },
  'Sem 2': {
    default: ['Mathematics-II', 'Environmental Science', 'Basic Electrical', 'Programming in C', 'Workshop', 'Communication Skills'],
  },
  'Sem 3': {
    'EC/ECE': ['Network Analysis', 'Electronic Devices', 'Digital Electronics', 'Signals & Systems', 'Electromagnetic Theory'],
    'CS/CSE': ['Data Structures', 'Discrete Mathematics', 'Computer Architecture', 'OOP in Java', 'Digital Logic'],
    default:  ['Mathematics-III', 'Fluid Mechanics', 'Thermodynamics', 'Strength of Materials', 'Manufacturing Processes'],
  },
  'Sem 4': {
    'EC/ECE': ['Analog Electronics', 'Control Systems', 'Communication Theory', 'Microprocessors', 'VLSI Design'],
    'CS/CSE': ['Database Management', 'Operating Systems', 'Theory of Computation', 'Analysis of Algorithms', 'Software Engineering'],
    default:  ['Mathematics-IV', 'Heat Transfer', 'Machine Design', 'Production Technology', 'Industrial Management'],
  },
  'Sem 5': {
    'EC/ECE': ['Digital Communication', 'Microprocessor & Interface', 'VLSI', 'Control System', 'Industrial Training'],
    'CS/CSE': ['Computer Networks', 'Compiler Design', 'AI & Machine Learning', 'Web Technologies', 'System Software'],
    default:  ['Operations Research', 'Power Systems', 'Electrical Machines', 'Power Electronics', 'Industrial Automation'],
  },
  'Sem 6': {
    'EC/ECE': ['Digital Communication', 'Microprocessor', 'VLSI', 'Control System', 'Industrial Training', 'Project'],
    'CS/CSE': ['Distributed Systems', 'Information Security', 'Cloud Computing', 'Mobile Computing', 'Project'],
    default:  ['Power System Protection', 'Drives & Control', 'Renewable Energy', 'Smart Grid', 'Project'],
  },
  'Sem 7': {
    'EC/ECE': ['Wireless Communication', 'DSP', 'Embedded Systems', 'Optical Fiber Communication', 'Project-II'],
    'CS/CSE': ['Big Data Analytics', 'IoT', 'Blockchain', 'Natural Language Processing', 'Project-II'],
    default:  ['Advanced Power Systems', 'Electric Vehicles', 'Smart Manufacturing', 'Industry 4.0', 'Project-II'],
  },
  'Sem 8': {
    'EC/ECE': ['Radar & Navigation', '5G Networks', 'MEMS', 'Elective-I', 'Major Project'],
    'CS/CSE': ['Quantum Computing', 'AR/VR', 'Elective-I', 'Elective-II', 'Major Project'],
    default:  ['Energy Audit', 'Power Quality', 'Elective-I', 'Elective-II', 'Major Project'],
  },
};

export interface AcademicSelection {
  year: string;
  branch: string;
  semester: string;
  subject: string;
  lectureNumber: number;
}

// ── Existing subject list (kept for backward compat) ──────────────
export const SUBJECTS = [
  'Digital Communication',
  'Microprocessor',
  'VLSI',
  'Control System',
  'Industrial Training',
  'Project',
  'Custom Subject',
] as const;

export type Subject = typeof SUBJECTS[number];

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
