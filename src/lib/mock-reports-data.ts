export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  cadence: "Daily" | "Weekly" | "Monthly" | "Custom";
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "daily", name: "Daily Safety Report", description: "24-hour compliance, violations, and incident summary.", cadence: "Daily" },
  { id: "weekly", name: "Weekly Executive Report", description: "Trends, worker risk ranking, and camera uptime for the week.", cadence: "Weekly" },
  { id: "monthly", name: "Monthly Compliance Report", description: "Full regulatory-ready compliance and audit trail.", cadence: "Monthly" },
  { id: "custom", name: "Custom Date Range", description: "Build a report for any date range and site combination.", cadence: "Custom" },
];

export interface ReportHistoryItem {
  id: string;
  name: string;
  template: ReportTemplate["cadence"];
  generatedAt: string;
  generatedBy: string;
  format: "PDF" | "CSV" | "Excel";
  sizeKb: number;
}
