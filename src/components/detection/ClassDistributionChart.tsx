import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { getClassColor, type BoundingBox } from "@/lib/mock-detection-data";

export function ClassDistributionChart({ boxes }: { boxes: BoundingBox[] }) {
  const counts = new Map<string, number>();
  boxes.forEach((b) => counts.set(b.class, (counts.get(b.class) ?? 0) + 1));
  const data = Array.from(counts.entries()).map(([cls, count]) => ({ cls, count }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Class Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {data.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No class data yet.</p>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="cls" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {data.map((entry) => (
                    <Cell key={entry.cls} fill={getClassColor(entry.cls)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
