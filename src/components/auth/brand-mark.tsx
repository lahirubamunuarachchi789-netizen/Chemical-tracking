import { FlaskConical } from "lucide-react";

/**
 * Concord ChemTrack brand mark.
 * Renders a navy gradient badge with a flask glyph + wordmark.
 */
export function BrandMark({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const isLight = variant === "light";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isLight
            ? "bg-white/10 ring-1 ring-white/25"
            : "bg-navy-800 shadow-sm shadow-navy-900/20",
        ].join(" ")}
      >
        <FlaskConical
          className={`h-6 w-6 ${isLight ? "text-white" : "text-white"}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </div>

      <div className="leading-tight">
        <p
          className={[
            "text-lg font-bold tracking-tight",
            isLight ? "text-white" : "text-navy-900",
          ].join(" ")}
        >
          Concord <span className="font-medium">ChemTrack</span>
        </p>
        <p
          className={[
            "text-[11px] font-medium uppercase tracking-[0.14em]",
            isLight ? "text-navy-200" : "text-navy-500",
          ].join(" ")}
        >
          Concord Footwear (Pvt) Ltd
        </p>
      </div>
    </div>
  );
}
