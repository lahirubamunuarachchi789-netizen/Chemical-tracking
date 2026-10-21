"use client";

import type { ReactNode } from "react";

const baseControl =
  "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm transition placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400";

/** Labelled text input used across the usage form. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  suffix,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  inputMode?: "text" | "decimal" | "numeric";
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold tracking-wide text-navy-600 uppercase">
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${baseControl} ${suffix ? "pr-12" : ""}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-navy-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Labelled select used for the Shift picker. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold tracking-wide text-navy-600 uppercase">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${baseControl} mt-1.5 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233c6cba' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Compact cell input for the table body. */
export function CellInput({
  value,
  onChange,
  placeholder,
  inputMode,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={`${baseControl} py-1.5 text-center`}
    />
  );
}

/** Read-only cell that shows a computed value. */
export function ComputedCell({
  value,
  highlight = false,
}: {
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-h-[38px] items-center justify-center rounded-lg border px-2 py-1.5 text-center text-sm font-semibold tabular-nums",
        highlight
          ? "border-sheet-300 bg-sheet-50 text-sheet-800"
          : "border-dashed border-navy-200 bg-navy-50/70 text-navy-400",
      ].join(" ")}
    >
      {value}
    </div>
  );
}
