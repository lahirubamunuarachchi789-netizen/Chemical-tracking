import type { SavingReportResult } from '@/app/dashboard/consumption-reports/saving-actions';

const MATERIALS = ['poly', 'iso'] as const;
type SavingMaterial = (typeof MATERIALS)[number];

const MATERIAL_LABELS: Record<SavingMaterial, string> = {
  poly: 'Poly',
  iso: 'ISO',
};

/** Material-group colours, matching the on-screen Saving Report table. */
const GROUP_FILLS: Record<SavingMaterial, readonly [number, number, number]> = {
  poly: [51, 86, 149], // sheet-600 #335695
  iso: [4, 120, 87], // emerald-700 #047857
};

/** Formats a weight with 2 decimals, matching the on-screen table. */
function kg(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Build and save the saving report as a PDF.
 *
 * jsPDF and the autoTable plugin are imported dynamically so their weight is
 * only paid when the user actually downloads, never on first page load.
 *
 * Layout mirrors the on-screen table: one row per ISO week of the selected
 * year, with Poly and ISO balances shown separately for each chemical, plus a
 * week total column and a final totals row.
 */
export async function downloadSavingReportPdf(
  report: SavingReportResult
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
  doc.text('Saving Report', 40, 44);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Year ${report.year}   |   Sri Lanka time (UTC+5:30)   |   ISO weeks`,
    40,
    62
  );

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Weeks with data: ${report.weeks.length}   Chemicals: ${report.chemicals.length}   Grand total balance: ${kg(
      report.grandTotal
    )} kg`,
    40,
    78
  );

  doc.text(
    `Poly balance: ${kg(report.polyGrandTotal)} kg   ISO balance: ${kg(
      report.isoGrandTotal
    )} kg`,
    40,
    92
  );

  // ------------------------------------------------------------ Table
  type Row = (string | number)[];

  const chemicalCount = report.chemicals.length;
  const balanceColumnCount = chemicalCount * 2;
  const totalColumnIndex = balanceColumnCount + 1;

  const head = [
    [
      { content: 'Week', rowSpan: 2, styles: { valign: 'middle' as const } },
      ...report.chemicals.map((chemical) => ({
        content: chemical,
        colSpan: 2,
        styles: { halign: 'center' as const },
      })),
      {
        content: 'Total',
        rowSpan: 2,
        styles: { halign: 'right' as const, valign: 'middle' as const },
      },
    ],
    report.chemicals.flatMap(() =>
      MATERIALS.map((kind) => ({
        content: MATERIAL_LABELS[kind],
        styles: {
          halign: 'center' as const,
          fillColor: [...GROUP_FILLS[kind]] as [number, number, number],
        },
      }))
    ),
  ];

  const body: Row[] = report.weeks.map((week) => [
    `Week ${week}`,
    ...report.chemicals.flatMap((chemical) =>
      MATERIALS.map((kind) =>
        kg(
          (kind === 'poly'
            ? report.polyBalances
            : report.isoBalances)[week][chemical]
        )
      )
    ),
    kg(report.weekTotals[week]),
  ]);

  const totalRow: Row = [
    'Total',
    ...report.chemicals.flatMap((chemical) =>
      MATERIALS.map((kind) =>
        kg(
          (kind === 'poly'
            ? report.polyChemicalTotals
            : report.isoChemicalTotals)[chemical]
        )
      )
    ),
    kg(report.grandTotal),
  ];

  // Column styles: Week left-aligned and bold, chemical balance columns
  // right-aligned, the Total column right-aligned and bold.
  type ColumnStyle = { halign: 'left' | 'center' | 'right'; fontStyle?: 'normal' | 'bold' };
  const columnStyles: Record<string, ColumnStyle> = { '0': { halign: 'left', fontStyle: 'bold' } };
  for (let i = 1; i <= balanceColumnCount; i += 1) {
    columnStyles[String(i)] = { halign: 'right' };
  }
  columnStyles[String(totalColumnIndex)] = { halign: 'right', fontStyle: 'bold' };

  autoTable(doc, {
    startY: 112,
    head,
    body,
    foot: [totalRow],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59], lineColor: [0, 0, 0] },
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
    columnStyles,
    // Negative balances read in red, matching the on-screen table.
    didParseCell: (data) => {
      if (
        (data.section === 'body' || data.section === 'foot') &&
        data.column.index > 0 &&
        data.column.index <= balanceColumnCount
      ) {
        const value = Number(String(data.cell.raw).replace(/,/g, ''));
        if (Number.isFinite(value) && value < 0) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
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
    'Balance = MRN - usage for the week. MRN is the quantity recorded in MRN Input for the week (Poly + ISO boxes). Usage is the loading records for the same ISO week in Sri Lanka time, using [(After - Before) + Start] - End, the same formula as the Weekly Report. A negative balance means more was consumed than recorded.',
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

  doc.save(`saving-report-${report.year}.pdf`);
}