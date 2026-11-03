import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { incidentTitle, useDashboardIncidents } from "@/hooks/use-dashboard-data";

const BAR_COLORS = ["var(--danger)", "var(--hazard)", "var(--hazard)", "#8b97a8", "#8b97a8"];

export function ViolationChart() {
  const { data } = useDashboardIncidents();
  const counts = new Map<string, number>();
  (data ?? []).forEach((i) => counts.set(incidentTitle(i.missing_ppe), (counts.get(incidentTitle(i.missing_ppe)) ?? 0) + 1));
  const breakdown = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <ChartCard title="Violations by Type" icon={AlertTriangle}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdown} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="type"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={118}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {breakdown.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
