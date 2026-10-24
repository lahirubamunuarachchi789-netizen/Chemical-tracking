import type { ConsumptionFilters, DailyUsage } from '@/lib/consumption-reports';

/** Formats a weight with 2 decimals, matching the on-screen cards. */
function kg(value: number): string {
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Human-readable summary of the filters that produced this report. */
function describeFilters(filters: ConsumptionFilters): string {
  const parts = [
    filters.injector ? `Injector ${filters.injector}` : null,
    filters.tank ? `Tank ${filters.tank}` : null,
    filters.chemical ? `Chemical ${filters.chemical}` : null,
    filters.week ? `Week ${filters.week}` : null,
    filters.year ? `Year ${filters.year}` : null,
  ].filter(Boolean) as string[];

  return parts.length > 0 ? parts.join('  ·  ') : 'All records';
}

/**
 * Build and save the daily consumption report as a PDF.
 *
 * jsPDF and the autoTable plugin are imported dynamically, so their weight is
 * only paid when the user downloads, never on first page load.
 *
 * Mirrors the on-screen report: one row per day, the summary figures shown in
 * the stats strip, and a totals row.
 */
export async function downloadDailyReportPdf(
  results: DailyUsage[],
  filters: ConsumptionFilters
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const totalRecords = results.reduce((sum, day) => sum + day.recordCount, 0);
  const totalUsage = results.reduce((sum, day) => sum + day.totalUsage, 0);
  const peakDay = results.length
    ? results.reduce((peak, day) =>
      day.totalUsage > peak.totalUsage ? day : peak
    )
    : null;

  // ------------------------------------------------------------ Header
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Daily Consumption Report', 40, 44);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(describeFilters(filters), 40, 62);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Days with data: ${results.length}    Total records: ${totalRecords}    Total usage: ${kg(
      totalUsage
    )} kg    Peak day: ${peakDay ? peakDay.formattedDate : '-'} (${peakDay ? kg(peakDay.totalUsage) : '-'
    } kg)`,
    40,
    78
  );
  doc.text('Dates are in Sri Lanka time (UTC+5:30).', 40, 92);

  // ------------------------------------------------------------ Table
  const body = results.map((day) => [
    day.formattedDate,
    day.dayOfWeek,
    day.chemical ?? '-',
    day.tank ?? '-',
    String(day.recordCount),
    kg(day.totalUsage),
  ]);

  autoTable(doc, {
    startY: 106,
    head: [['Date', 'Day', 'Chemical', 'Tank', 'Records', 'Usage (kg)']],
    body,
    // One cell per column: the totals sit under Records and Usage (kg).
    foot: [['Total', '', String(totalRecords), kg(totalUsage)]],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5, textColor: [30, 41, 59] },
    headStyles: {
      fillColor: [13, 100, 108],
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
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'left' },
      3: { halign: 'left' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  // ------------------------------------------------------------ Footer
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 0;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const note = doc.splitTextToSize(
    'Usage per day applies [(After - Before) + Start] - End, the same formula used on screen and in the weekly report.',
    pageWidth - 80
  );
  doc.text(note, 40, Math.min(finalY + 24, doc.internal.pageSize.getHeight() - 60));

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

  doc.save('daily-consumption-report.pdf');
}
