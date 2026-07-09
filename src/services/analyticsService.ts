import { attendanceService } from './attendanceService';
import { studentsDB } from './db';

export const analyticsService = {
  /** Pie chart data: overall status distribution */
  getStatusDistribution() {
    const stats = attendanceService.getOverallStats();
    return [
      { name: 'Present', value: stats.present, color: '#10b981' },
      { name: 'Absent',  value: stats.absent,  color: '#ef4444' },
      { name: 'Late',    value: stats.late,     color: '#f59e0b' },
      { name: 'Leave',   value: stats.leave,    color: '#3b82f6' },
    ].filter((d) => d.value > 0);
  },

  /** Monthly bar chart data */
  getMonthlyData() {
    return attendanceService.getMonthlyStats();
  },

  /** Summary card stats */
  getSummaryStats() {
    const studentStats = attendanceService.getAllStudentStats();
    const withData = studentStats.filter((s) => s.total > 0);
    if (withData.length === 0) {
      return {
        totalStudents: studentsDB.getAll().length,
        avgPercentage: 0,
        highestPercentage: 0,
        lowestPercentage: 0,
        below75Count: 0,
        perfectAttendanceCount: 0,
      };
    }
    const percentages = withData.map((s) => s.percentage);
    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    const below75 = withData.filter((s) => s.percentage < 75).length;
    const perfect = withData.filter((s) => s.percentage === 100).length;
    return {
      totalStudents: studentsDB.getAll().length,
      avgPercentage: avg,
      highestPercentage: Math.max(...percentages),
      lowestPercentage: Math.min(...percentages),
      below75Count: below75,
      perfectAttendanceCount: perfect,
    };
  },

  /** Top 5 highest attendance students */
  getTopStudents(limit = 5) {
    return attendanceService
      .getAllStudentStats()
      .filter((s) => s.total > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);
  },

  /** Top 5 lowest attendance students */
  getBottomStudents(limit = 5) {
    return attendanceService
      .getAllStudentStats()
      .filter((s) => s.total > 0)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, limit);
  },

  /** Per-subject stats */
  getSubjectWiseStats() {
    const all = attendanceService.getAll();
    const subjectMap = new Map<string, { present: number; absent: number; late: number; leave: number; total: number }>();

    all.forEach((r) => {
      if (!subjectMap.has(r.subject)) {
        subjectMap.set(r.subject, { present: 0, absent: 0, late: 0, leave: 0, total: 0 });
      }
      const entry = subjectMap.get(r.subject)!;
      entry[r.status]++;
      entry.total++;
    });

    return Array.from(subjectMap.entries()).map(([subject, stats]) => {
      const attended = stats.present + stats.late;
      const percentage = stats.total > 0 ? Math.round((attended / stats.total) * 100) : 0;
      return { subject, ...stats, percentage };
    });
  },

  /** AI: Predict students likely to go below 75% (currently between 75-85%) */
  getAtRiskStudents() {
    return attendanceService
      .getAllStudentStats()
      .filter((s) => s.total > 0 && s.percentage >= 75 && s.percentage <= 85)
      .sort((a, b) => a.percentage - b.percentage);
  },

  /** Generate text summary */
  generateSummary(): string {
    const stats = this.getSummaryStats();
    const low = attendanceService.getLowAttendanceStudents();
    const sessions = attendanceService.getUniqueSessions().length;
    return `
VERTEX ATTENDANCE SYSTEM
Vertex Institute of Technology — B.Tech Programs
Attendance Summary Report
─────────────────────────────────────────
Total Students     : ${stats.totalStudents}
Total Sessions     : ${sessions}
Average Attendance : ${stats.avgPercentage}%
Highest Attendance : ${stats.highestPercentage}%
Lowest Attendance  : ${stats.lowestPercentage}%
Perfect Attendance : ${stats.perfectAttendanceCount} students
Below 75% (Warning): ${stats.below75Count} students
─────────────────────────────────────────
${low.length > 0 ? `⚠️  LOW ATTENDANCE WARNING (< 75%):` : '✅ All students above 75% attendance'}
${low.map((s) => `  • ${s.student.name} (${s.student.rollNumber}) — ${s.percentage}%`).join('\n')}
    `.trim();
  },
};
