'use client';

import { useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';

import { ConsumptionReportView } from './consumption-report-view';
import { WeeklyReportView } from './weekly-report-view';

type ReportTab = 'daily' | 'weekly';

const TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: 'daily', label: 'Daily Report', icon: CalendarDays },
  { key: 'weekly', label: 'Weekly Report', icon: CalendarRange },
];

/**
 * Consumption Reports container.
 *
 * Two report types over the same underlying records:
 *   - Daily  : usage per calendar day, with a per-day detail dialog.
 *   - Weekly : Poly recorded in MRNRecords against total usage, per chemical.
 *
 * Both views stay mounted while hidden, so switching tabs does not throw away
 * a search the user has already run.
 */
export function ConsumptionReportsTabs() {
  const [tab, setTab] = useState<ReportTab>('daily');

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Report type"
        className="inline-flex rounded-xl border-navy-100 bg-white p-1 shadow-sm"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${key}-report-panel`}
              id={`${key}-report-tab`}
              onClick={() => setTab(key)}
              className={[
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
                active
                  ? 'bg-sheet-600 text-white shadow-sm'
                  : 'text-navy-600 hover:bg-navy-50',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="daily-report-panel"
        aria-labelledby="daily-report-tab"
        hidden={tab !== 'daily'}
      >
        <ConsumptionReportView />
      </div>

      <div
        role="tabpanel"
        id="weekly-report-panel"
        aria-labelledby="weekly-report-tab"
        hidden={tab !== 'weekly'}
      >
        <WeeklyReportView />
      </div>
    </div>
  );
}
