import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Users2 } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { useDashboardWorkers } from "@/hooks/use-dashboard-data";

const COLORS = ["var(--hazard)", "var(--detect)", "var(--success)", "#8b97a8", "#c084fc", "#f472b6"];

export function WorkerDistributionChart() {
  const { data } = useDashboardWorkers();
  const counts = new Map<string, number>();
  (data ?? []).forEach((w) => counts.set(w.department, (counts.get(w.department) ?? 0) + 1));
  const distribution = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  const total = distribution.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Workforce by Department" icon={Users2}>
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
              {distribution.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-xl font-bold text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground">Workers</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {distribution.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
