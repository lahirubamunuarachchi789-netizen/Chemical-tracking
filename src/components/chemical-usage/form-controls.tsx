"use client";

import type { KeyboardEventHandler, Ref } from "react";

const baseControl =
  "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm transition placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400";

/**
 * Chevron used to mark a select as a dropdown.
 *
 * Inline SVG data URI so the control needs no extra asset or icon component.
 */
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233c6cba' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/** Labelled text input used across the usage form. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  suffix,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  inputMode?: "text" | "decimal" | "numeric";
  suffix?: string;
  disabled?: boolean;
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
          disabled={disabled}
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
        style={{ backgroundImage: selectChevron }}
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
  invalid = false,
  ref,
  navRow,
  navField,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  ariaLabel: string;
  /** Marks the cell as holding a value that failed validation. */
  invalid?: boolean;
  /** Ref to the underlying input, used for arrow-key navigation. */
  ref?: Ref<HTMLInputElement>;
  /** Id of the row this cell belongs to; used for arrow-key navigation. */
  navRow?: string;
  /** Which column this cell is; used for arrow-key navigation. */
  navField?: string;
  /** Keyboard handler, used for arrow-key navigation. */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      data-nav-row={navRow}
      data-nav-field={navField}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      className={[
        baseControl,
        "py-1.5 text-center",
        invalid
          ? // `!` matters here: globals.css sets a global `* { border-color }`
            // rule outside any cascade layer, so it outranks Tailwind's
            // layered `border-*` utilities unless they are marked important.
            "border-red-400! bg-red-50/60 text-red-800 focus:border-red-500! focus:ring-red-200"
          : "",
      ].join(" ")}
    />
  );
}

/**
 * Compact dropdown for the table body.
 *
 * Mirrors {@link CellInput} so a row keeps a consistent height once a cell is
 * turned into a picker.
 */
export function CellSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select…",
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  ariaLabel: string;
  /** Label of the empty option shown when nothing is selected yet. */
  placeholder?: string;
  /** Marks the cell as holding a value that failed validation. */
  invalid?: boolean;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={[
        baseControl,
        "appearance-none bg-[length:0.9rem] bg-[right_0.5rem_center] bg-no-repeat py-1.5 pr-7 pl-2 text-center",
        invalid
          ? // `!` matters here: globals.css sets a global `* { border-color }`
            // rule outside any cascade layer, so it outranks Tailwind's
            // layered `border-*` utilities unless they are marked important.
            "border-red-400! bg-red-50/60 text-red-800 focus:border-red-500! focus:ring-red-200"
          : "",
      ].join(" ")}
      style={{ backgroundImage: selectChevron }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
