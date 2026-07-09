import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AttendanceRecord, StudentAttendanceStats } from '../types';
import { settingsDB } from './db';

// ─── CSV ──────────────────────────────────────────────────────────────────────
export function exportToCSV(records: AttendanceRecord[], filename: string): void {
  const headers = ['Roll Number', 'Name', 'Date', 'Subject', 'Faculty', 'Lecture No', 'Status', 'Remarks', 'Timestamp'];
  const rows = records.map((r) => [
    r.rollNumber,
    r.studentName,
    r.date,
    r.subject,
    r.faculty,
    r.lectureNumber,
    r.status,
    r.remarks,
    r.timestamp,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// ─── Excel ────────────────────────────────────────────────────────────────────
export function exportToExcel(records: AttendanceRecord[], filename: string, sheetName = 'Attendance'): void {
  const data = records.map((r) => ({
    'Roll Number': r.rollNumber,
    'Student Name': r.studentName,
    Date: r.date,
    Subject: r.subject,
    Faculty: r.faculty,
    'Lecture No': r.lectureNumber,
    Status: r.status.toUpperCase(),
    Remarks: r.remarks,
    Timestamp: r.timestamp,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  // Column widths
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 22 },
    { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Excel Student Report ─────────────────────────────────────────────────────
export function exportStudentReportToExcel(stats: StudentAttendanceStats[], filename: string): void {
  const data = stats.map((s) => ({
    'Roll Number': s.student.rollNumber,
    'Student Name': s.student.name,
    'Total Classes': s.total,
    Present: s.present,
    Absent: s.absent,
    Late: s.late,
    Leave: s.leave,
    'Attendance %': `${s.percentage}%`,
    Status: s.percentage < 75 ? '⚠ LOW' : s.percentage === 100 ? '✓ PERFECT' : '✓ OK',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Attendance Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export function exportToPDF(records: AttendanceRecord[], title: string): void {
  const settings = settingsDB.get();
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.instituteName, doc.internal.pageSize.width / 2, 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${settings.department}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
  doc.text(`Semester: ${settings.semester}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, 38, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 45);

  // Table
  const tableData = records.map((r, i) => [
    i + 1,
    r.rollNumber,
    r.studentName,
    r.date,
    r.subject,
    r.faculty,
    r.lectureNumber,
    r.status.toUpperCase(),
    r.remarks || '-',
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Roll No', 'Name', 'Date', 'Subject', 'Faculty', 'Lec', 'Status', 'Remarks']],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 28 },
      2: { cellWidth: 40 },
      3: { cellWidth: 22 },
      4: { cellWidth: 32 },
      5: { cellWidth: 30 },
      6: { cellWidth: 10 },
      7: { cellWidth: 18 },
      8: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.column.index === 7) {
        const status = String(data.cell.raw).toLowerCase();
        if (status === 'present') data.cell.styles.textColor = [16, 185, 129];
        else if (status === 'absent') data.cell.styles.textColor = [239, 68, 68];
        else if (status === 'late') data.cell.styles.textColor = [245, 158, 11];
        else if (status === 'leave') data.cell.styles.textColor = [59, 130, 246];
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ─── PDF Student Summary ──────────────────────────────────────────────────────
export function exportStudentReportToPDF(stats: StudentAttendanceStats[], title: string): void {
  const settings = settingsDB.get();
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.instituteName, doc.internal.pageSize.width / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.department} | ${settings.semester}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, 32, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 40);

  const tableData = stats.map((s, i) => [
    i + 1,
    s.student.rollNumber,
    s.student.name,
    s.total,
    s.present,
    s.absent,
    s.late,
    s.leave,
    `${s.percentage}%`,
    s.percentage < 75 ? 'LOW ⚠' : 'OK',
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['#', 'Roll No', 'Name', 'Total', 'P', 'A', 'L', 'Lv', '%', 'Status']],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    didParseCell: (data) => {
      if (data.column.index === 9) {
        const v = String(data.cell.raw);
        data.cell.styles.textColor = v.includes('LOW') ? [239, 68, 68] : [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 8) {
        const pct = parseInt(String(data.cell.raw));
        if (pct < 75) data.cell.styles.textColor = [239, 68, 68];
        else data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ─── Print ────────────────────────────────────────────────────────────────────
export function printAttendance(records: AttendanceRecord[], title: string): void {
  const settings = settingsDB.get();
  const rows = records
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9ff'}">
          <td>${i + 1}</td>
          <td>${r.rollNumber}</td>
          <td>${r.studentName}</td>
          <td>${r.date}</td>
          <td>${r.subject}</td>
          <td>${r.faculty}</td>
          <td>${r.lectureNumber}</td>
          <td style="color:${statusColor(r.status)};font-weight:bold">${r.status.toUpperCase()}</td>
          <td>${r.remarks || '-'}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2, h3, p { text-align: center; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
      th { background: #4f46e5; color: #fff; padding: 8px 6px; }
      td { border: 1px solid #e2e8f0; padding: 6px; }
    </style></head>
    <body>
      <h2>${settings.instituteName}</h2>
      <h3>${settings.department}</h3>
      <p>${settings.semester}</p>
      <h3>${title}</h3>
      <p>Printed on: ${new Date().toLocaleString('en-IN')}</p>
      <table>
        <thead><tr>
          <th>#</th><th>Roll No</th><th>Name</th><th>Date</th><th>Subject</th>
          <th>Faculty</th><th>Lec</th><th>Status</th><th>Remarks</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'present': return '#10b981';
    case 'absent':  return '#ef4444';
    case 'late':    return '#f59e0b';
    case 'leave':   return '#3b82f6';
    default: return '#000';
  }
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
