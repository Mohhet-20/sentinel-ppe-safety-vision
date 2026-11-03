import { motion } from "framer-motion";
import { HardHat, MapPin, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { WorkerProfile } from "@/lib/mock-workers-data";

const STATUS_STYLES: Record<WorkerProfile["status"], string> = {
  "on-site": "bg-success",
  "on-break": "bg-primary",
  "off-site": "bg-muted-foreground",
};

function riskLabel(score: number) {
  if (score >= 70) return { text: "High risk", color: "text-danger" };
  if (score >= 45) return { text: "Medium risk", color: "text-primary" };
  return { text: "Low risk", color: "text-success" };
}

export function WorkerCard({ worker, index, onClick }: { worker: WorkerProfile; index: number; onClick: () => void }) {
  const risk = riskLabel(worker.riskScore);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.02 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card/80 p-4 text-left backdrop-blur-sm transition-shadow hover:shadow-panel"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-detect/15 text-foreground">{worker.initials}</AvatarFallback>
          </Avatar>
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card", STATUS_STYLES[worker.status])} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{worker.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{worker.employeeId} · {worker.department}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" /> <span className="truncate">{worker.currentZone}</span>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <HardHat className="h-3 w-3" /> Compliance
        </span>
        <span className="font-mono font-semibold text-foreground">{worker.complianceScore}%</span>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="capitalize">
          {worker.shift} shift
        </Badge>
        <span className={cn("flex items-center gap-1 text-[10px] font-medium", risk.color)}>
          <ShieldAlert className="h-3 w-3" /> {risk.text}
        </span>
      </div>
    </motion.button>
  );
}
