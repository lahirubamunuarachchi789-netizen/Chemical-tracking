'use client';

import { FlaskConical, Clock, Activity, ChevronRight } from 'lucide-react';

import { tierClasses, usageTier, type DailyUsage } from '@/lib/consumption-reports';

/**
 * Map tank codes to user-friendly labels.
 *
 * Type A tanks (A1, A2) are Poly tanks.
 * Type B tanks (B1, B2) are ISO tanks.
 */
function tankLabel(code?: string): string {
  if (!code) return '';
  const type = code.charAt(0); // 'A' or 'B'
  return type === 'A' ? 'Poly' : type === 'B' ? 'ISO' : code;
}

/**
 * Build the chemical + tank display string, e.g. "BASF Midsole Poly".
 */
function chemicalTankDisplay(day: DailyUsage): string {
  const parts = [day.chemical, tankLabel(day.tank)].filter(Boolean);
  return parts.length ? parts.join(' ') : '';
}

/**
 * A single day's consumption card.
 *
 * Designed like a premium stationery card: the date header sits on a coloured
 * band whose intensity reflects usage volume (green -> yellow -> red), while the
 * total usage takes centre stage with a supporting micro-chart hint.
 *
 * Cards are clickable – pass an onClick handler to open a detail view.
 */
export function DailyUsageCard({
  day,
  onClick,
}: { day: DailyUsage; onClick?: () => void }) {
  const tier = usageTier(day.totalUsage);
  const chemicalTank = chemicalTankDisplay(day);

  return (
    <article
      className={[
        'flex flex-col rounded-2xl border border-navy-100 bg-white shadow-sm transition hover:shadow-md cursor-pointer',
        onClick ? 'hover:border-sheet-600 active:scale-[0.98]' : '',
        tier === 'none' ? 'opacity-60' : '',
      ].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View details for ${day.formattedDate}` : undefined}
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
            {chemicalTank && (
              <p className="text-[10px] font-semibold tracking-wide text-navy-500 uppercase mt-1">
                {chemicalTank}
              </p>
            )}
          </div>
          <Activity className="h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
          {onClick && (
            <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
}
