import type { LucideIcon } from "lucide-react";

/** Heading block shared by every module page. */
export function PageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white shadow-sm">
          <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-navy-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
