import { useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { useLiveChannel } from "@/hooks/use-live-channel";

interface Sample {
  time: string;
  fps: number;
  latency: number;
}

/** Rolling window of the inference telemetry the backend pushes on every prediction. */
export function PerformanceChart() {
  const [samples, setSamples] = useState<Sample[]>([]);

  useLiveChannel((event) => {
    if (event.type !== "telemetry") return;
    const p = (event.payload ?? {}) as { fps?: number; inference_ms?: number };
    const latency = p.inference_ms;
    if (typeof latency !== "number") return;
    setSamples((s) =>
      [
        ...s,
        {
          time: new Date().toLocaleTimeString("en-GB", { minute: "2-digit", second: "2-digit" }),
          fps: Number((p.fps ?? 0).toFixed(1)),
          latency: Number(latency.toFixed(1)),
        },
      ].slice(-40),
    );
  });

  return (
    <ChartCard title="Inference Performance" icon={LineChartIcon}>
      {samples.length < 2 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">Streams live once frames are being analyzed.</p>
          <Link to="/app/detection/live" className="text-xs font-medium text-primary hover:underline">
            Start the live webcam →
          </Link>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={samples} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" minTickGap={30} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis yAxisId="fps" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="latency" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Line yAxisId="fps" type="monotone" dataKey="fps" name="FPS" stroke="var(--detect)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="latency" type="monotone" dataKey="latency" name="Latency (ms)" stroke="var(--hazard)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-detect" /> FPS</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Latency (ms)</span>
      </div>
    </ChartCard>
  );
}
