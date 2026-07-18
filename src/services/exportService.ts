import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AttendanceRecord, StudentAttendanceStats } from '../types';
import { settingsDB } from './db';

async function loadLogoImage(url: string): Promise<string | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── RAW EXPORTS ──────────────────────────────────────────────────────────────

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
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 22 },
    { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(records: AttendanceRecord[], title: string): Promise<void> {
  const settings = settingsDB.get();
  const doc = new jsPDF({ orientation: 'landscape' });
  const logoDataUrl = await loadLogoImage(settings.logoUrl || '');

  let startY = 15;
  if (logoDataUrl) {
    const logoSize = 22;
    doc.addImage(logoDataUrl, 'PNG', (doc.internal.pageSize.width / 2) - (logoSize / 2), 5, logoSize, logoSize);
    startY = 35;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.instituteName, doc.internal.pageSize.width / 2, startY, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${settings.department} | Semester: ${settings.semester}`, doc.internal.pageSize.width / 2, startY + 7, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, startY + 17, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, startY + 25);

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
    startY: startY + 30,
    head: [['#', 'Roll No', 'Name', 'Date', 'Subject', 'Faculty', 'Lec', 'Status', 'Remarks']],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    didDrawPage: () => {
      if (logoDataUrl) {
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const logoSize = 100;
        doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.addImage(logoDataUrl, 'PNG', (pageWidth / 2) - (logoSize / 2), (pageHeight / 2) - (logoSize / 2), logoSize, logoSize);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      }
    },
    didParseCell: (data) => {
      if (data.column.index === 7) {
        const v = String(data.cell.raw);
        if (v === 'PRESENT') data.cell.styles.textColor = [16, 185, 129];
        else if (v === 'ABSENT') data.cell.styles.textColor = [239, 68, 68];
        else data.cell.styles.textColor = [59, 130, 246];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ─── SUMMARY EXPORTS ──────────────────────────────────────────────────────────

export function exportSummaryToCSV(stats: StudentAttendanceStats[], filename: string): void {
  const headers = ['Roll Number', 'Name', 'Branch', 'Year', 'Semester', 'Section', 'Total Working Days', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %'];
  const rows = stats.map((s) => [
    s.student.rollNumber,
    s.student.name,
    s.student.branch,
    s.student.year,
    s.student.semester,
    s.student.section,
    s.total,
    s.present,
    s.absent,
    s.late,
    s.leave,
    `${s.percentage}%`
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportSummaryToExcel(stats: StudentAttendanceStats[], filename: string, sheetName = 'Attendance Summary'): void {
  const data = stats.map((s) => ({
    'Roll Number': s.student.rollNumber,
    'Student Name': s.student.name,
    'Branch': s.student.branch,
    'Year': s.student.year,
    'Semester': s.student.semester,
    'Section': s.student.section,
    'Total Working Days': s.total,
    Present: s.present,
    Absent: s.absent,
    Late: s.late,
    Leave: s.leave,
    'Attendance %': `${s.percentage}%`,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, 
    { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportSummaryToPDF(stats: StudentAttendanceStats[], title: string): Promise<void> {
  const settings = settingsDB.get();
  const doc = new jsPDF({ orientation: 'landscape' });
  const logoDataUrl = await loadLogoImage(settings.logoUrl || '');

  let startY = 15;
  if (logoDataUrl) {
    const logoSize = 22;
    doc.addImage(logoDataUrl, 'PNG', (doc.internal.pageSize.width / 2) - (logoSize / 2), 5, logoSize, logoSize);
    startY = 35;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.instituteName, doc.internal.pageSize.width / 2, startY, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${settings.department}`, doc.internal.pageSize.width / 2, startY + 7, { align: 'center' });
  doc.text(`Semester: ${settings.semester}`, doc.internal.pageSize.width / 2, startY + 13, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, startY + 23, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, startY + 30);

  const tableData = stats.map((s, i) => [
    i + 1,
    s.student.rollNumber,
    s.student.name,
    s.student.branch,
    s.student.year,
    s.student.semester,
    s.student.section,
    s.total,
    s.present,
    s.absent,
    `${s.percentage}%`,
  ]);

  autoTable(doc, {
    startY: startY + 35,
    head: [['#', 'Roll No', 'Name', 'Branch', 'Year', 'Sem', 'Sec', 'Total', 'Present', 'Absent', '%']],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    didDrawPage: () => {
      if (logoDataUrl) {
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const logoSize = 100;
        doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.addImage(logoDataUrl, 'PNG', (pageWidth / 2) - (logoSize / 2), (pageHeight / 2) - (logoSize / 2), logoSize, logoSize);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      }
    },
    didParseCell: (data) => {
      if (data.column.index === 10) {
        const pct = parseInt(String(data.cell.raw));
        if (pct < 75) data.cell.styles.textColor = [239, 68, 68];
        else data.cell.styles.textColor = [16, 185, 129];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

export function printSummary(stats: StudentAttendanceStats[], title: string): void {
  const settings = settingsDB.get();
  
  const statusColor = (pct: number) => {
    if (pct < 75) return '#ef4444';
    if (pct === 100) return '#10b981';
    return '#3b82f6';
  };

  const rows = stats
    .map(
      (s, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9ff'}">
          <td>${i + 1}</td>
          <td>${s.student.rollNumber}</td>
          <td>${s.student.name}</td>
          <td>${s.student.branch}</td>
          <td>${s.student.year}</td>
          <td>${s.student.semester}</td>
          <td>${s.student.section}</td>
          <td>${s.total}</td>
          <td>${s.present}</td>
          <td>${s.absent}</td>
          <td style="color:${statusColor(s.percentage)};font-weight:bold">${s.percentage}%</td>
        </tr>`,
    )
    .join('');

  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; position: relative; min-height: 100vh; }
      h2, h3, p { text-align: center; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
      th { background: #4f46e5; color: #fff; padding: 8px 6px; }
      td { border: 1px solid #e2e8f0; padding: 6px; }
      @media print {
        .watermark {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          opacity: 0.08; z-index: -9999; width: 60%; max-width: 500px; pointer-events: none;
        }
      }
      @media screen {
        .watermark {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          opacity: 0.08; z-index: -9999; width: 60%; max-width: 500px; pointer-events: none;
        }
      }
    </style></head>
    <body>
      ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="watermark" />` : ''}
      ${settings.logoUrl ? `<div style="text-align: center; margin-bottom: 15px;"><img src="${settings.logoUrl}" style="height: 60px; object-fit: contain;" /></div>` : ''}
      <h2>${settings.instituteName}</h2>
      <h3>${settings.department}</h3>
      <p>${settings.semester}</p>
      <h3>${title}</h3>
      <p>Printed on: ${new Date().toLocaleString('en-IN')}</p>
      <table>
        <thead><tr>
          <th>#</th><th>Roll No</th><th>Name</th><th>Branch</th><th>Year</th>
          <th>Sem</th><th>Sec</th><th>Total Days</th><th>Present</th><th>Absent</th><th>%</th>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
