'use client';

import { FlaskConical, Clock, Activity } from 'lucide-react';

import { tierClasses, usageTier, type DailyUsage } from '@/lib/consumption-reports';

/**
 * A single day's consumption card.
 *
 * Designed like a premium stationery card: the date header sits on a coloured
 * band whose intensity reflects usage volume (green → yellow → red), while the
 * total usage takes centre stage with a supporting micro-chart hint.
 */
export function DailyUsageCard({ day }: { day: DailyUsage }) {
  const tier = usageTier(day.totalUsage);

  return (
    <article
      className={[
        'flex flex-col rounded-2xl border border-navy-100 bg-white shadow-sm transition hover:shadow-md',
        tier === 'none' ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div
        className={[
          'rounded-t-xl border-b border-navy-100 px-4 py-3 flex items-center justify-between',
          tierClasses(tier),
        ].join(' ')}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-wider text-opacity-70 uppercase">
            {day.dayOfWeek}
          </span>
          <span className="text-sm font-bold text-navy-900">{day.formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-opacity-60">
            {day.recordCount} record{day.recordCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col">
        <div className="mb-3 flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums text-navy-900">
            {day.totalUsage.toFixed(2)}
          </span>
          <span className="text-xs font-medium text-navy-500">kg</span>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-4 border-t border-navy-50">
          <FlaskConical className="h-5 w-5 shrink-0 text-navy-400" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-navy-500 uppercase">
              Total usage for {day.formattedDate}
            </p>
            <p className="text-xs text-navy-600">
              {tier === 'none'
                ? 'No usage recorded.'
                : tier === 'low'
                  ? 'Light consumption.'
                  : tier === 'medium'
                    ? 'Moderate consumption.'
                    : 'High consumption.'}
          </p>
          </div>
          <Activity className="h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}