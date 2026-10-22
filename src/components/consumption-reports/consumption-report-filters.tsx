'use client';

import { useState } from 'react';
import {
  Building2,
  Database,
  FlaskConical,
  Calendar,
  List,
  Search,
} from 'lucide-react';

import { SelectField } from '@/components/chemical-usage/form-controls';
import {
  CONSUMPTION_FILTERS,
  type ConsumptionFilters,
} from '@/lib/consumption-reports';

const icons: Record<string, React.ElementType> = {
  injector: Building2,
  tank: Database,
  chemical: FlaskConical,
  week: Calendar,
  year: List,
};

/**
 * Consumption report filter panel.
 *
 * Five dropdowns (Injector, Tank, Chemical, Week, Year) plus a Search button.
 * Emits the selected filters via onSearch when the user clicks Search.
 */
export function ConsumptionReportFilters({
  onSearch,
}: {
  onSearch: (filters: ConsumptionFilters) => void;
}) {
  const [injector, setInjector] = useState('');
  const [tank, setTank] = useState('');
  const [chemical, setChemical] = useState('');
  const [week, setWeek] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const years = CONSUMPTION_FILTERS.years();

  function handleSearch() {
    onSearch({
      injector: injector || undefined,
      tank: tank || undefined,
      chemical: chemical || undefined,
      week: week ? parseInt(week, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  return (
    <section
      className="rounded-2xl border border-navy-100 bg-white shadow-sm"
      aria-label="Report filters"
    >
      <div className="border-b border-navy-100 bg-navy-50/60 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900 uppercase tracking-wider">
          <List className="h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
          Search criteria
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 sm:p-6">
        {[
          {
            key: 'injector',
            label: 'Injector',
            options: CONSUMPTION_FILTERS.injectors,
            value: injector,
            onChange: setInjector,
          },
          {
            key: 'tank',
            label: 'Tank',
            options: CONSUMPTION_FILTERS.tanks,
            value: tank,
            onChange: setTank,
          },
          {
            key: 'chemical',
            label: 'Chemical',
            options: CONSUMPTION_FILTERS.chemicals,
            value: chemical,
            onChange: setChemical,
          },
          {
            key: 'week',
            label: 'Week',
            options: CONSUMPTION_FILTERS.weeks.map(String),
            value: week,
            onChange: setWeek,
          },
          {
            key: 'year',
            label: 'Year',
            options: years.map(String),
            value: year,
            onChange: setYear,
          },
        ].map((field) => {
          const Icon = icons[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-600 uppercase">
                <Icon className="h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
                {field.label}
              </label>
              <SelectField
                label=""
                value={field.value}
                onChange={field.onChange}
                options={field.options}
                className="flex-1"
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-navy-100 bg-navy-50/40 px-5 py-4 sm:px-6 sm:flex sm:items-center sm:justify-between">
        <p className="text-[11px] text-navy-400">
          Dates are shown in Sri Lanka time (UTC+5:30).
        </p>
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-2 rounded-lg bg-sheet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sheet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sheet-500 focus-visible:ring-offset-2 sm:ml-4"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </div>
    </section>
  );
}