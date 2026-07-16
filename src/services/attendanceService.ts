import { attendanceDB, studentsDB } from './db';
import { useStore } from '../store/useStore';
import { isSameDepartment } from '../utils/departmentUtils';
import type { AttendanceRecord, AttendanceStats, StudentAttendanceStats } from '../types';

function getFilteredRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  const currentUser = useStore.getState().currentUser;
  if (!currentUser) return records;

  if (currentUser.role === 'hod' || currentUser.role === 'teacher') {
    const validRollNumbers = new Set(
      studentsDB.getAll().map(s => s.rollNumber)
    );
    return records.filter(r => validRollNumbers.has(r.rollNumber));
  }

  return records;
}

export const attendanceService = {
  /** Get all records */
  getAll(): AttendanceRecord[] {
    return getFilteredRecords(attendanceDB.getAll());
  },

  /** Get records for a specific date */
  getByDate(date: string): AttendanceRecord[] {
    return getFilteredRecords(attendanceDB.getByDate(date));
  },

  /** Get records for a specific session (date + subject + lecture) */
  getBySession(date: string, subject: string, lectureNumber: number): AttendanceRecord[] {
    return getFilteredRecords(attendanceDB.getBySession(date, subject, lectureNumber));
  },

  /** Get a student's full attendance history */
  getStudentHistory(rollNumber: string): AttendanceRecord[] {
    return getFilteredRecords(attendanceDB.getByStudent(rollNumber));
  },

  /** Save a full session of records */
  saveSession(
    records: Omit<AttendanceRecord, 'id' | 'timestamp'>[],
  ): void {
    attendanceDB.saveSession(records);
  },

  /** Get overall stats across all records */
  getOverallStats(): AttendanceStats {
    const all = this.getAll();
    const total = all.length;
    const present = all.filter((r) => r.status === 'present').length;
    const absent = all.filter((r) => r.status === 'absent').length;
    const late = all.filter((r) => r.status === 'late').length;
    const leave = all.filter((r) => r.status === 'leave').length;
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, present, absent, late, leave, percentage };
  },

  /** Get today's stats */
  getTodayStats(today: string): AttendanceStats {
    const records = attendanceDB.getByDate(today);
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const leave = records.filter((r) => r.status === 'leave').length;
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, present, absent, late, leave, percentage };
  },

  /** Get per-student stats */
  getAllStudentStats(): StudentAttendanceStats[] {
    let students = studentsDB.getAll();
    const currentUser = useStore.getState().currentUser;
    if (currentUser?.role === 'teacher') {
      // Teachers shouldn't really use this, but if they do, don't show all students
      students = [];
    }

    const allRecords = this.getAll();
    
    // Group records by student to optimize O(N*M) down to O(N+M)
    const recordsByStudent = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      if (!recordsByStudent.has(r.rollNumber)) {
        recordsByStudent.set(r.rollNumber, []);
      }
      recordsByStudent.get(r.rollNumber)!.push(r);
    }

    return students.map((student) => {
      const records = recordsByStudent.get(student.rollNumber) || [];
      const total = records.length;
      let present = 0, absent = 0, late = 0, leave = 0;
      for (const r of records) {
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
        else if (r.status === 'leave') leave++;
      }
      const attended = present + late;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { student, total, present, absent, late, leave, percentage };
    });
  },

  /** Get one student's stats */
  getStudentStats(rollNumber: string): StudentAttendanceStats | null {
    const student = studentsDB.getByRollNumber(rollNumber);
    if (!student) return null;
    const records = attendanceDB.getByStudent(rollNumber);
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const leave = records.filter((r) => r.status === 'leave').length;
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { student, total, present, absent, late, leave, percentage };
  },

  /** Get unique dates that have attendance records */
  getUniqueDates(): string[] {
    const all = this.getAll();
    return (Array.from(new Set(all.map((r) => r.date))) as string[]).sort().reverse();
  },

  /** Get unique subjects */
  getUniqueSubjects(): string[] {
    const all = this.getAll();
    return (Array.from(new Set(all.map((r) => r.subject))) as string[]).sort();
  },

  /** Get unique sessions (date + subject + lectureNumber) */
  getUniqueSessions(): { date: string; subject: string; lectureNumber: number; faculty: string }[] {
    const all = this.getAll();
    const sessionMap = new Map<string, { date: string; subject: string; lectureNumber: number; faculty: string }>();
    all.forEach((r) => {
      const key = `${r.date}_${r.subject}_${r.lectureNumber}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: r.date,
          subject: r.subject,
          lectureNumber: r.lectureNumber,
          faculty: r.faculty,
        });
      }
    });
    return Array.from(sessionMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  },

  /** Monthly stats for bar chart */
  getMonthlyStats(): { month: string; present: number; absent: number; late: number; leave: number }[] {
    const all = this.getAll();
    const monthMap = new Map<string, { present: number; absent: number; late: number; leave: number }>();

    all.forEach((r) => {
      const month = r.date.substring(0, 7); // YYYY-MM
      if (!monthMap.has(month)) {
        monthMap.set(month, { present: 0, absent: 0, late: 0, leave: 0 });
      }
      const entry = monthMap.get(month)!;
      entry[r.status]++;
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        ...stats,
      }));
  },

  /** Students below 75% attendance (low attendance warning) */
  getLowAttendanceStudents(): StudentAttendanceStats[] {
    return this.getAllStudentStats()
      .filter((s) => s.total > 0 && s.percentage < 75)
      .sort((a, b) => a.percentage - b.percentage);
  },

  /** Check if today's attendance has been taken for a subject */
  isTodayAttendanceTaken(today: string, subject: string): boolean {
    return attendanceDB.getByDateAndSubject(today, subject).length > 0;
  },

  /** Get recent attendance sessions (last 10) */
  getRecentSessions(limit = 10): { date: string; subject: string; lectureNumber: number; faculty: string; count: number }[] {
    const sessions = this.getUniqueSessions().slice(0, limit);
    return sessions.map((s) => {
      const records = this.getBySession(s.date, s.subject, s.lectureNumber);
      return { ...s, count: records.length };
    });
  },
};
