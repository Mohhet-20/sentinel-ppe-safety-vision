import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { useDashboardTrends } from "@/hooks/use-dashboard-data";

/** Daily violation count over the last 14 days, from /analytics/detection-trends. */
export function ComplianceChart() {
  const { data } = useDashboardTrends();
  const points = (data ?? []).map((p) => ({ day: format(parseISO(p.day), "MMM d"), violations: p.count }));
  const total = points.reduce((s, p) => s + p.violations, 0);

  return (
    <ChartCard title="Violation Trend · 14 days" icon={TrendingDown} right={<span className="font-mono text-[10px] text-muted-foreground">{total} total</span>}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="violationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--hazard)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--hazard)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="violations" name="Violations" stroke="var(--hazard)" strokeWidth={2} fill="url(#violationFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
