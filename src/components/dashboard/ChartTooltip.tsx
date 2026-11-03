import type { TooltipProps } from "recharts";

export function ChartTooltip({ suffix = "", active, payload, label }: TooltipProps<number, string> & { suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="mb-0.5 font-mono text-[10px] text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} className="font-mono font-medium text-foreground">
          {entry.name}: {entry.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}
