import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Database,
  FileSpreadsheet,
} from "lucide-react";

/**
 * Sidebar navigation for the signed-in area.
 *
 * `href` values are relative to the `/dashboard` root, so the same list can be
 * used by the sidebar, the dashboard cards and the page headers.
 */
export interface NavigationItem {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  {
    label: "MRN Input",
    href: "/dashboard/mrn-input",
    description:
      "Capture the MRN sheet: chemical type and Poly / ISO weights for each of the ten loading sets.",
    icon: FileSpreadsheet,
  },
  {
    label: "Chemical Usage Input",
    href: "/dashboard/chemical-usage-input",
    description:
      "Record every chemical batch issued to the tannery and finishing lines.",
    icon: ClipboardList,
  },
  {
    label: "Consumption Reports",
    href: "/dashboard/consumption-reports",
    description:
      "Review consumption trends, overuse and cost drift over time.",
    icon: BarChart3,
  },
  {
    label: "Chemical Master Data",
    href: "/dashboard/chemical-master-data",
    description:
      "Maintain the catalogue of chemicals, units and storage locations.",
    icon: Database,
  },
];
