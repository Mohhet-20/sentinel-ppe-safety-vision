import { useMemo, useState } from "react";
import { format as formatDate, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ReportTemplateGrid } from "@/components/reports/ReportTemplateGrid";
import { ReportHistoryTable } from "@/components/reports/ReportHistoryTable";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { ViolationChart } from "@/components/dashboard/ViolationChart";
import { REPORT_TEMPLATES, type ReportHistoryItem } from "@/lib/mock-reports-data";
import { ApiError, downloadCsvReport, downloadExcelReport, downloadPdfReport } from "@/lib/api-client";
import { useDashboardCameras, useDashboardIncidents, useDashboardSummary } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/providers/AuthProvider";

const WINDOW_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

export default function Reports() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("weekly");
  const [startDate, setStartDate] = useState(formatDate(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(true);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const { user } = useAuth();
  const { data: incidents = [] } = useDashboardIncidents();
  const { data: summary } = useDashboardSummary();
  const { data: cameras = [] } = useDashboardCameras();

  const template = REPORT_TEMPLATES.find((t) => t.id === selectedTemplate)!;

  // Summary for the selected reporting window, computed from live incidents.
  const report = useMemo(() => {
    const end = selectedTemplate === "custom" ? new Date(`${endDate}T23:59:59`) : new Date();
    const start = selectedTemplate === "custom" ? new Date(`${startDate}T00:00:00`) : subDays(end, WINDOW_DAYS[selectedTemplate]);
    const inRange = incidents.filter((i) => {
      const t = new Date(i.timestamp);
      return t >= start && t <= end;
    });
    return {
      period: `${formatDate(start, "MMM d")} – ${formatDate(end, "MMM d, yyyy")}`,
      violations: inRange.length,
      resolved: inRange.filter((i) => i.status === "resolved").length,
      sites: new Set(cameras.map((c) => c.site).filter(Boolean)).size,
    };
  }, [incidents, cameras, selectedTemplate, startDate, endDate]);

  function generateReport() {
    setGenerating(true);
    setReady(false);
    window.setTimeout(() => {
      setGenerating(false);
      setReady(true);
      toast({ title: "Report generated", description: `${template.name} is ready to preview and export.` });
    }, 1400);
  }

  async function exportAs(format: ReportHistoryItem["format"]) {
    toast({ title: `Generating ${format}`, description: `Building ${template.name} from live data…` });
    try {
      const bytes = format === "PDF" ? await downloadPdfReport() : format === "CSV" ? await downloadCsvReport() : await downloadExcelReport();
      toast({ title: `${format} downloaded`, description: "Report saved to your device." });
      setHistory((h) => [
        {
          id: crypto.randomUUID(),
          name: `${template.name} · ${report.period}`,
          template: template.cadence,
          generatedAt: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
          generatedBy: user?.full_name ?? user?.username ?? "You",
          format,
          sizeKb: Math.max(1, Math.round(bytes / 1024)),
        },
        ...h,
      ]);
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof ApiError ? err.message : "Could not reach the backend.",
        variant: "destructive",
      });
    }
  }

  function printPreview() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Reports Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and export compliance and incident reports for audits and stakeholders.
        </p>
      </motion.div>

      <ReportTemplateGrid templates={REPORT_TEMPLATES} selectedId={selectedTemplate} onSelect={setSelectedTemplate} />

      {selectedTemplate === "custom" && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Site</label>
              <select className="h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option>All sites</option>
                <option>Riverside Plant</option>
                <option>Northgate Hub</option>
                <option>Delta Line 4</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </div>
        <Button onClick={generateReport} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate report"}
        </Button>
      </div>

      {generating ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : ready ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hud-panel rounded-xl border border-success/25 bg-success/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-success/15">
                  <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Executive Summary · {report.period}</p>
                  <p className="text-xs text-muted-foreground">{report.sites} sites covered</p>
                </div>
              </div>
              <div className="flex gap-4">
                <SummaryStat icon={ShieldCheck} label="Avg. compliance" value={summary ? `${summary.live_compliance.toFixed(1)}%` : "—"} />
                <SummaryStat icon={Building2} label="Violations" value={report.violations.toString()} />
                <SummaryStat icon={CheckCircle2} label="Incidents resolved" value={report.resolved.toString()} />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ComplianceChart />
            <ViolationChart />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Export &amp; Print</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => void exportAs("PDF")}>
                <FileText className="h-3.5 w-3.5" /> Export PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void exportAs("CSV")}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void exportAs("Excel")}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
              </Button>
              <Button size="sm" variant="ghost" onClick={printPreview}>
                <Printer className="h-3.5 w-3.5" /> Print preview
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      <ReportHistoryTable items={history} onDownload={(item) => void exportAs(item.format)} />
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="hidden flex-col items-end sm:flex">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
