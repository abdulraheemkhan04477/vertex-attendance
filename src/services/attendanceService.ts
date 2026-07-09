import { attendanceDB, studentsDB } from './db';
import type { AttendanceRecord, AttendanceStats, StudentAttendanceStats } from '../types';

export const attendanceService = {
  /** Get all records */
  getAll(): AttendanceRecord[] {
    return attendanceDB.getAll();
  },

  /** Get records for a specific date */
  getByDate(date: string): AttendanceRecord[] {
    return attendanceDB.getByDate(date);
  },

  /** Get records for a specific session (date + subject + lecture) */
  getBySession(date: string, subject: string, lectureNumber: number): AttendanceRecord[] {
    return attendanceDB.getBySession(date, subject, lectureNumber);
  },

  /** Get a student's full attendance history */
  getStudentHistory(rollNumber: string): AttendanceRecord[] {
    return attendanceDB.getByStudent(rollNumber);
  },

  /** Save a full session of records */
  saveSession(
    records: Omit<AttendanceRecord, 'id' | 'timestamp'>[],
  ): void {
    attendanceDB.saveSession(records);
  },

  /** Get overall stats across all records */
  getOverallStats(): AttendanceStats {
    const all = attendanceDB.getAll();
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
    const students = studentsDB.getAll();
    const allRecords = attendanceDB.getAll();

    return students.map((student) => {
      const records = allRecords.filter((r) => r.rollNumber === student.rollNumber);
      const total = records.length;
      const present = records.filter((r) => r.status === 'present').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const leave = records.filter((r) => r.status === 'leave').length;
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
    const all = attendanceDB.getAll();
    return [...new Set(all.map((r) => r.date))].sort().reverse();
  },

  /** Get unique subjects */
  getUniqueSubjects(): string[] {
    const all = attendanceDB.getAll();
    return [...new Set(all.map((r) => r.subject))].sort();
  },

  /** Get unique sessions (date + subject + lectureNumber) */
  getUniqueSessions(): { date: string; subject: string; lectureNumber: number; faculty: string }[] {
    const all = attendanceDB.getAll();
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
    const all = attendanceDB.getAll();
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
      const records = attendanceDB.getBySession(s.date, s.subject, s.lectureNumber);
      return { ...s, count: records.length };
    });
  },
};
