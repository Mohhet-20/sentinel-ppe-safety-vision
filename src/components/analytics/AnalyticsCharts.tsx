import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, Clock, Gauge, MapPin, PieChart as PieChartIcon } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import type { BackendIncident } from "@/lib/api-client";
import { byHour, bySeverity, byType, byWeekday, confidenceBuckets } from "@/lib/incident-stats";

// Every chart here is computed from the live incident list (lib/incident-stats.ts).

const AXIS = { fontSize: 10, fill: "var(--muted-foreground)" };
const SEVERITY_COLORS = ["var(--danger)", "var(--hazard)", "var(--detect)", "#8b97a8"];

export function ViolationTypeChart({ incidents }: { incidents: BackendIncident[] }) {
  return (
    <ChartCard title="Violations by PPE Type" icon={BarChart3}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byType(incidents).slice(0, 6)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="type" tick={AXIS} axisLine={false} tickLine={false} width={118} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="count" name="Incidents" fill="var(--danger)" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function SeverityMixChart({ incidents }: { incidents: BackendIncident[] }) {
  const data = bySeverity(incidents);
  return (
    <ChartCard title="Severity Mix" icon={PieChartIcon}>
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={SEVERITY_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-xl font-bold text-foreground">{incidents.length}</p>
          <p className="text-[10px] text-muted-foreground">Incidents</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[i] }} />
            {entry.name} · {entry.value}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function ViolationZoneChart({ data }: { data: { zone: string; count: number }[] }) {
  return (
    <ChartCard title="Violations by Zone" icon={MapPin}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="zone" tick={{ ...AXIS, fontSize: 9 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={26} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="count" name="Violations" fill="var(--hazard)" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ConfidenceDistributionChart({ incidents }: { incidents: BackendIncident[] }) {
  return (
    <ChartCard title="Detection Confidence" icon={Gauge}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={confidenceBuckets(incidents)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ ...AXIS, fontSize: 9 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="count" name="Incidents" fill="var(--detect)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function WeekdayRadarChart({ incidents }: { incidents: BackendIncident[] }) {
  return (
    <ChartCard title="Violations by Weekday" icon={Activity}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={byWeekday(incidents)} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="day" tick={AXIS} />
            <Tooltip content={<ChartTooltip />} />
            <Radar dataKey="count" name="Violations" stroke="var(--hazard)" fill="var(--hazard)" fillOpacity={0.25} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function HourlyViolationsChart({ incidents }: { incidents: BackendIncident[] }) {
  return (
    <ChartCard title="Violations by Hour" icon={Clock}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byHour(incidents)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hour" interval={3} tick={AXIS} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={26} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
            <Bar dataKey="count" name="Violations" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
