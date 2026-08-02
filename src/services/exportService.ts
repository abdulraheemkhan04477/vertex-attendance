import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AttendanceRecord, StudentAttendanceStats } from '../types';
import { settingsDB } from './db';

// ─── Report Context ─────────────────────────────────────────────────────────
/** Metadata shown once at the top of the report header. */
export interface ReportContext {
  branch?: string;
  year?: string;
  semester?: string;
  section?: string;
  subject?: string;
  facultyName?: string;
  date?: string;         // formatted date string
  session?: string;      // e.g. "Morning" / "Afternoon" — optional
  lecture?: string | number;
  courseName?: string;   // e.g. "B.Tech"
  academicYear?: string; // e.g. "B.Tech Academic Year 2026-27"
}

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
  const sorted = stats;
  const headers = ['S.No.', 'Roll Number', 'Student Name', 'Total Working Days', 'Present', 'Absent', 'Attendance %'];
  const rows = sorted.map((s, i) => [
    i + 1,
    s.student.rollNumber,
    s.student.name,
    s.total,
    s.present,
    s.absent,
    `${s.percentage}%`
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportSummaryToExcel(stats: StudentAttendanceStats[], filename: string, sheetName = 'Attendance Summary'): void {
  const sorted = stats;
  const data = sorted.map((s, i) => ({
    'S.No.': i + 1,
    'Roll Number': s.student.rollNumber,
    'Student Name': s.student.name,
    'Total Working Days': s.total,
    Present: s.present,
    Absent: s.absent,
    'Attendance %': `${s.percentage}%`,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportSummaryToPDF(
  stats: StudentAttendanceStats[],
  title: string,
  ctx: ReportContext = {}
): Promise<void> {
  const settings = settingsDB.get();
  const sorted = stats;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoImage(settings.logoUrl || '');
  const pageW = doc.internal.pageSize.width; // 210mm
  const margin = 14;
  const centerX = pageW / 2;

  // ── Helper: advance y by n mm ──
  let y = 8;
  const gap = (n: number) => { y += n; };

  // ── 1. Logo ──────────────────────────────────────────────────────
  if (logoDataUrl) {
    const logoSize = 15;
    doc.addImage(logoDataUrl, 'PNG', centerX - logoSize / 2, y, logoSize, logoSize);
    gap(16);
  }

  // ── 2. Course Name (e.g. B.Tech) ─────────────────────────────────
  const courseName = ctx.courseName || settings.department || 'B.Tech';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 70);
  doc.text(courseName, centerX, y, { align: 'center' });
  gap(5);

  // ── 3. Academic Year (e.g. B.Tech Academic Year 2026-27) ──────────
  const academicYear = ctx.academicYear || settings.semester || '';
  if (academicYear) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 100);
    doc.text(academicYear, centerX, y, { align: 'center' });
    gap(5);
  }

  // ── 4. Report Title ────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(title, centerX, y, { align: 'center' });
  gap(4);

  // Thick rule under title
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.55);
  doc.line(margin, y, pageW - margin, y);
  gap(4);

  // ── 5. Academic Information — 2 compact rows ──────────────────────
  // Row A: Year | Semester
  // Row B: Branch | Section
  const rowH = 4.5;
  const half = (pageW - margin * 2) / 2;
  const lw = 22; // label width mm

  const drawKV = (label: string, value: string, x: number, rowY: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`${label}:`, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(25, 25, 25);
    doc.text(value, x + lw, rowY);
  };

  const hasAcadInfo = ctx.year || ctx.semester || ctx.branch || ctx.section;
  if (hasAcadInfo) {
    // Row A
    if (ctx.year)     drawKV('Year',     ctx.year,     margin,          y);
    if (ctx.semester) drawKV('Semester', ctx.semester, margin + half,   y);
    if (ctx.year || ctx.semester) gap(rowH);
    // Row B
    if (ctx.branch)   drawKV('Branch',   ctx.branch,   margin,          y);
    if (ctx.section)  drawKV('Section',  ctx.section,  margin + half,   y);
    if (ctx.branch || ctx.section) gap(rowH);
    gap(1);
  }

  // ── 6. Faculty Name ───────────────────────────────────────────────
  if (ctx.facultyName) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Faculty Name:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(25, 25, 25);
    doc.text(ctx.facultyName, margin + lw, y);
    gap(rowH);
  }

  // ── 7. Printed On ─────────────────────────────────────────────────
  const now = new Date();
  const printedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const printedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  const printedOn = `Printed On: ${printedDate} | ${printedTime}`;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130, 130, 130);
  doc.text(printedOn, pageW - margin, y, { align: 'right' });
  gap(4);

  // Thin rule before table
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageW - margin, y);
  gap(1.5);

  // ── Table ─────────────────────────────────────────────────────────
  const tableData = sorted.map((s, i) => [
    i + 1,
    s.student.rollNumber,
    s.student.name,
    s.total,
    s.present,
    s.absent,
    `${s.percentage}%`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['S.No.', 'Roll Number', 'Student Name', 'Total Working Days', 'Present', 'Absent', 'Attendance %']],
    body: tableData,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'left' },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 17 },
      5: { halign: 'center', cellWidth: 17 },
      6: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [246, 247, 255] },
    tableLineColor: [210, 213, 235],
    tableLineWidth: 0.18,
    didDrawPage: () => {
      // Watermark
      if (logoDataUrl) {
        const ps = doc.internal.pageSize;
        const pw = ps.width ? ps.width : ps.getWidth();
        const ph = ps.height ? ps.height : ps.getHeight();
        const ls = 80;
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logoDataUrl, 'PNG', (pw / 2) - (ls / 2), (ph / 2) - (ls / 2), ls, ls);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      }
      // Footer
      const ps = doc.internal.pageSize;
      const pw = ps.width ? ps.width : ps.getWidth();
      const ph = ps.height ? ps.height : ps.getHeight();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(170, 170, 170);
      doc.text(
        `${settings.instituteName || ''} — Attendance Report — Page ${(doc as any).internal.getCurrentPageInfo().pageNumber}`,
        pw / 2, ph - 6, { align: 'center' }
      );
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const pct = parseInt(String(data.cell.raw));
        data.cell.styles.textColor = pct < 75 ? [220, 38, 38] : [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

export function printSummary(
  stats: StudentAttendanceStats[],
  title: string,
  ctx: ReportContext = {}
): void {
  const settings = settingsDB.get();
  const sorted = stats;

  const fmtPct = (pct: number) => {
    if (Number.isInteger(pct)) return `${pct}%`;
    return `${pct.toFixed(1)}%`;
  };
  const pctColor = (pct: number) => (pct < 75 ? '#dc2626' : '#16a34a');

  const rows = sorted
    .map(
      (s, i) =>
        `<tr>
          <td class="c">${i + 1}</td>
          <td class="c mono">${s.student.rollNumber}</td>
          <td class="name">${s.student.name}</td>
          <td class="c">${s.total}</td>
          <td class="c grn">${s.present}</td>
          <td class="c pct" style="color:${pctColor(s.percentage)}">${fmtPct(s.percentage)}</td>
        </tr>`,
    )
    .join('');

  // ── Printed On: date + time on same line ──────────────────────────
  const now = new Date();
  const printedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const printedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  const printedOn = `${printedDate} | ${printedTime}`;

  // ── Derive header strings ─────────────────────────────────────────
  const courseName   = ctx.courseName   || settings.department || 'B.Tech';
  const academicYear = ctx.academicYear || settings.semester   || '';
  const facultyName  = ctx.facultyName  || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      background: #fff;
      color: #1f2937;
      font-size: 10px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .hdr {
      text-align: center;
      padding-bottom: 2px;
    }
    .hdr img {
      height: 32px;
      object-fit: contain;
      display: block;
      margin: 0 auto 2px;
    }
    .h-institute {
      font-size: 13px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.3px;
      line-height: 1.2;
    }
    .h-course {
      font-size: 9.5px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 1px;
    }
    .h-acyear {
      font-size: 8.5px;
      font-weight: 500;
      color: #6b7280;
      margin-top: 1px;
    }
    .h-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 3px;
      letter-spacing: 0.2px;
    }

    /* ── Dividers ── */
    .rule-thick {
      border: none;
      border-top: 2px solid #4f46e5;
      margin: 4px 0;
    }
    .rule-thin {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 3px 0;
    }

    /* ── Meta info grid ── */
    .meta-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .meta-grid td {
      padding: 2px 4px;
      font-size: 9px;
      vertical-align: middle;
      width: 25%;
    }
    .ml {
      font-weight: 700;
      color: #4f46e5;
      white-space: nowrap;
    }
    .ml::after { content: ':'; margin-right: 4px; }
    .mv { color: #1f2937; font-weight: 500; }

    /* ── Faculty row ── */
    .fac-row {
      font-size: 9px;
      padding: 2px 4px;
    }
    .fac-row .ml { font-weight: 700; color: #4f46e5; }
    .fac-row .ml::after { content: ':'; margin-right: 4px; }

    /* ── Printed On ── */
    .printed-on {
      font-size: 8px;
      color: #9ca3af;
      text-align: right;
      font-style: italic;
      padding: 2px 4px;
    }

    /* ── Student summary ── */
    .summary-bar {
      font-size: 8.5px;
      color: #6b7280;
      padding: 2px 4px;
      font-weight: 500;
    }

    /* ── Data Table ── */
    table.data-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      page-break-inside: auto;
    }
    table.data-tbl thead {
      display: table-header-group;
    }
    table.data-tbl tbody {
      display: table-row-group;
    }
    table.data-tbl tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    table.data-tbl thead tr {
      background: #4f46e5;
      color: #fff;
    }
    table.data-tbl thead th {
      padding: 7px 6px;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #4338ca;
      text-align: center;
      white-space: nowrap;
    }
    table.data-tbl thead th.tl { text-align: left; }
    table.data-tbl tbody tr:nth-child(even) { background: #f8f9ff; }
    table.data-tbl tbody tr:nth-child(odd)  { background: #ffffff; }
    table.data-tbl tbody tr:hover { background: #eef0ff; }
    table.data-tbl tbody td {
      padding: 6px 6px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
    }

    /* ── Cell utilities ── */
    td.c    { text-align: center; }
    td.name { font-weight: 500; font-size: 10px; }
    td.mono { font-family: 'Courier New', Consolas, monospace; font-weight: 600; font-size: 9.5px; }
    td.grn  { color: #16a34a; font-weight: 600; }
    td.pct  { font-weight: 700; font-size: 10.5px; }


    /* ── Watermark ── */
    .wm {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.04;
      z-index: -1;
      width: 45%;
      max-width: 320px;
      pointer-events: none;
    }

    /* ── Footer ── */
    .ftr {
      margin-top: 10px;
      text-align: center;
      font-size: 7.5px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      padding-top: 4px;
    }

    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="wm">` : ''}

  <!-- Header -->
  <div class="hdr">
    ${settings.logoUrl ? `<img src="${settings.logoUrl}">` : ''}
    <div class="h-institute">${settings.instituteName || ''}</div>
    <div class="h-course">${courseName}</div>
    ${academicYear ? `<div class="h-acyear">${academicYear}</div>` : ''}
    <div class="h-title">${title}</div>
  </div>

  <hr class="rule-thick">

  <!-- Academic Information -->
  <table class="meta-grid">
    <tr>
      <td class="ml">Year</td><td class="mv">${ctx.year || '—'}</td>
      <td class="ml">Semester</td><td class="mv">${ctx.semester || '—'}</td>
    </tr>
    <tr>
      <td class="ml">Branch</td><td class="mv">${ctx.branch || '—'}</td>
      <td class="ml">Section</td><td class="mv">${ctx.section || '—'}</td>
    </tr>
  </table>

  ${facultyName ? `<div class="fac-row"><span class="ml">Faculty Name</span><span class="mv">${facultyName}</span></div>` : ''}

  <div class="printed-on">Printed On: ${printedOn}</div>

  <hr class="rule-thin">

  <div class="summary-bar">Total Students: ${sorted.length}</div>

  <!-- Data Table -->
  <table class="data-tbl">
    <thead>
      <tr>
        <th style="width:6%">S. No.</th>
        <th style="width:16%">Roll Number</th>
        <th class="tl">Student Name</th>
        <th style="width:14%">Total Days</th>
        <th style="width:12%">Present</th>
        <th style="width:16%">Attendance (%)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="ftr">${settings.instituteName || ''} &mdash; Attendance Report &mdash; ${printedDate}</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
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
