import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 sm:flex">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-mono text-xs font-medium tabular-nums text-foreground">
        {now.toLocaleTimeString("en-US", { hour12: false })}
      </span>
    </div>
  );
}
