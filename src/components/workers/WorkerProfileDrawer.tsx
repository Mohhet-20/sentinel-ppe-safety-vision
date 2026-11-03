import { CheckCircle2, Clock, HardHat, ShieldAlert, XCircle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { WorkerProfile } from "@/lib/mock-workers-data";

const SEVERITY_VARIANT = { critical: "danger", high: "default", medium: "detect", low: "secondary" } as const;

export function WorkerProfileDrawer({
  worker,
  open,
  onOpenChange,
}: {
  worker: WorkerProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!worker) return null;

  const ppeItems: [string, boolean][] = [
    ["Hard Hat", worker.ppeStatus.hardHat],
    ["Hi-Vis Vest", worker.ppeStatus.vest],
    ["Goggles", worker.ppeStatus.goggles],
    ["Gloves", worker.ppeStatus.gloves],
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-detect/15 text-foreground">{worker.initials}</AvatarFallback>
            </Avatar>
            <div>
              <DrawerTitle>{worker.name}</DrawerTitle>
              <DrawerDescription>
                {worker.employeeId} · {worker.role} · {worker.department}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label="Compliance score" value={worker.complianceScore} colorClass="bg-success" />
            <ScoreCard label="Risk score" value={worker.riskScore} colorClass={worker.riskScore >= 70 ? "bg-danger" : worker.riskScore >= 45 ? "bg-primary" : "bg-success"} />
          </div>

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current PPE Status</h4>
            <div className="grid grid-cols-2 gap-2">
              {ppeItems.map(([label, ok]) => (
                <div key={label} className="flex items-center gap-2 rounded-md border border-border/70 bg-secondary/20 px-2.5 py-2 text-xs">
                  {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
                  <span className="text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Site" value={worker.site} />
            <Field label="Current zone" value={worker.currentZone} />
            <Field label="Shift" value={worker.shift} />
            <Field label="Last seen" value={worker.lastSeen} />
          </section>

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Attendance Summary</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <AttendanceStat label="Present" value={worker.attendance.present} accent="success" />
              <AttendanceStat label="Late" value={worker.attendance.late} accent="hazard" />
              <AttendanceStat label="Absent" value={worker.attendance.absent} accent="danger" />
              <AttendanceStat label="Shifts" value={worker.attendance.totalShifts} accent="neutral" />
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Clock className="h-3 w-3" /> Today&rsquo;s Timeline
            </h4>
            <div className="relative ml-1 flex flex-col gap-3 border-l border-border pl-4">
              {worker.timeline.map((t) => (
                <div key={t.id} className="relative">
                  <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-detect" />
                  <p className="text-xs text-foreground">{t.event}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{t.time}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <ShieldAlert className="h-3 w-3" /> Violation History
            </h4>
            {worker.violationHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No violations on record. Clean history.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {worker.violationHistory.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border border-border/70 bg-secondary/20 px-2.5 py-2 text-xs">
                    <span className="text-foreground">{v.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{v.date}</span>
                      <Badge variant={SEVERITY_VARIANT[v.severity]} className="capitalize">
                        {v.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <HardHat className="h-3 w-3" /> Recent Detection History
            </h4>
            <div className="flex flex-col gap-1.5">
              {worker.detectionHistory.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border border-border/70 bg-secondary/20 px-2.5 py-2 text-xs">
                  <span className="text-foreground">{d.camera}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{d.time}</span>
                    <span className={d.result === "violation" ? "text-danger" : "text-success"}>{d.result}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function ScoreCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-2">
        <Progress value={value} indicatorClassName={colorClass} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function AttendanceStat({ label, value, accent }: { label: string; value: number; accent: "success" | "hazard" | "danger" | "neutral" }) {
  const styles = { success: "text-success", hazard: "text-primary", danger: "text-danger", neutral: "text-foreground" };
  return (
    <div className="rounded-md border border-border/70 bg-secondary/20 py-2">
      <p className={`font-display text-base font-bold ${styles[accent]}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
