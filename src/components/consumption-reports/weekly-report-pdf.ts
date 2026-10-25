import type { WeeklyReportResult } from '@/lib/consumption-reports';

/** Formats a weight with 2 decimals, matching the on-screen table. */
function kg(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Column-group colours, mirroring GROUP_STYLES in the on-screen view: Poly is
 * the app's sheet blue, ISO is green.
 */
const GROUP_FILLS = {
  poly: [51, 86, 149], // sheet-600 #335695
  iso: [4, 120, 87], // emerald-700 #047857
} as const;

/** Columns belonging to each material group, in table order. */
const GROUP_COLUMNS = {
  poly: [1, 2, 3],
  iso: [4, 5, 6],
} as const;

/**
 * Build and save the weekly report as a PDF.
 *
 * jsPDF and the autoTable plugin are imported dynamically so their weight is
 * only paid when the user actually downloads, never on first page load.
 *
 * Layout mirrors the on-screen table: one chemical per row, with Poly and ISO
 * column groups over MRN / Usage / Balance, plus a totals row.
 */
export async function downloadWeeklyReportPdf(
  report: WeeklyReportResult
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ------------------------------------------------------------ Header
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Weekly Consumption Report', 40, 44);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Week ${report.week}, ${report.year}   |   ${report.weekStart} to ${report.weekEnd}   |   Sri Lanka time (UTC+5:30)`,
    40,
    62
  );

  // Totals summary line. Each material's label is set in its group colour so
  // the blue/green split is obvious even before the table.
  doc.setFontSize(9);
  const summaryY = 78;
  doc.setTextColor(...GROUP_FILLS.poly);
  doc.text('Poly:', 40, summaryY);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `MRN ${kg(report.totals.poly.mrn)} kg · Usage ${kg(
      report.totals.poly.totalUsage
    )} kg · Balance ${kg(report.totals.poly.balance)} kg`,
    40 + doc.getTextWidth('Poly: '),
    summaryY
  );

  doc.setTextColor(...GROUP_FILLS.iso);
  doc.text('ISO:', 40, summaryY + 14);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `MRN ${kg(report.totals.iso.mrn)} kg · Usage ${kg(
      report.totals.iso.totalUsage
    )} kg · Balance ${kg(report.totals.iso.balance)} kg`,
    40 + doc.getTextWidth('ISO:  '),
    summaryY + 14
  );

  // ------------------------------------------------------------ Table
  type Row = (string | number)[];

  const body: Row[] = report.chemicals.map((row) => [
    row.chemical,
    kg(row.poly.mrn),
    kg(row.poly.totalUsage),
    kg(row.poly.balance),
    kg(row.iso.mrn),
    kg(row.iso.totalUsage),
    kg(row.iso.balance),
  ]);

  const totalRow: Row = [
    'Total',
    kg(report.totals.poly.mrn),
    kg(report.totals.poly.totalUsage),
    kg(report.totals.poly.balance),
    kg(report.totals.iso.mrn),
    kg(report.totals.iso.totalUsage),
    kg(report.totals.iso.balance),
  ];

  autoTable(doc, {
    startY: 104,
    head: [
      ['Chemical', 'Poly MRN', 'Poly Usage', 'Poly Balance', 'ISO MRN', 'ISO Usage', 'ISO Balance'],
    ],
    body,
    foot: [totalRow],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
    // Only the Chemical column stays neutral; each material group gets its own
    // header colour in didParseCell below.
    headStyles: {
      fillColor: [36, 66, 125],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 150 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    // Per-material header colour, then a negative-balance cue for the body.
    didParseCell: (data) => {
      if (data.section === 'head') {
        // The Chemical column keeps the neutral navy; Poly headers are blue,
        // ISO headers green - the same split as the on-screen table.
        if ((GROUP_COLUMNS.poly as readonly number[]).includes(data.column.index)) {
          data.cell.styles.fillColor = [...GROUP_FILLS.poly];
        } else if ((GROUP_COLUMNS.iso as readonly number[]).includes(data.column.index)) {
          data.cell.styles.fillColor = [...GROUP_FILLS.iso];
        }
        return;
      }

      const isBalance = data.column.index === 3 || data.column.index === 6;
      if (!isBalance) return;
      const value = Number(String(data.cell.raw).replace(/,/g, ''));
      if (Number.isFinite(value) && value < 0) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ------------------------------------------------------------ Footer
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 0;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const note = doc.splitTextToSize(
    'MRN is the quantity recorded in MRN Input for this week. Usage is the loading records for the same week, split by tank type: A tanks (A1, A2) count towards Poly, B tanks (B1, B2) towards ISO, using [(After - Before) + Start] - End. Balance = MRN - usage; a negative balance means more was consumed than recorded.',
    pageWidth - 80
  );
  doc.text(note, 40, Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 60));

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 24,
      { align: 'right' }
    );
  }

  doc.save(`weekly-report-${report.year}-week-${String(report.week).padStart(2, '0')}.pdf`);
}
