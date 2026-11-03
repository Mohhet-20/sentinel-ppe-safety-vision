import { useState } from "react";
import { CheckCircle2, Download, ImageOff, Loader2, MessageSquare, Search, Send, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import type { Incident } from "@/lib/mock-incidents-data";

type IncidentStatus = Incident["status"];

const SEVERITY_VARIANT = { critical: "danger", high: "default", medium: "detect", low: "secondary" } as const;

export function IncidentDrawer({
  incident,
  open,
  onOpenChange,
  onStatusChange,
  isUpdating = false,
}: {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChange?: (status: IncidentStatus, resolution?: string) => void | Promise<void>;
  isUpdating?: boolean;
}) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ id: string; author: string; text: string; time: string }[]>([]);

  if (!incident) return null;

  function handleDownload() {
    toast({ title: "Evidence export queued", description: `Preparing full-resolution package for ${incident!.id}.` });
  }

  function handleAddComment() {
    if (!comment.trim()) return;
    setComments((c) => [...c, { id: crypto.randomUUID(), author: "You", text: comment, time: "just now" }]);
    setComment("");
  }

  const allComments = [...incident.comments, ...comments];

  const STATUS_ACTIONS: { status: IncidentStatus; label: string; icon: typeof Search; resolution?: string }[] = [
    { status: "investigating", label: "Investigate", icon: Search },
    { status: "resolved", label: "Resolve", icon: CheckCircle2, resolution: "Resolved by operator from Incident Center." },
    { status: "dismissed", label: "Dismiss", icon: XCircle, resolution: "Dismissed as a false positive." },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <DrawerTitle>{incident.id}</DrawerTitle>
            <Badge variant={SEVERITY_VARIANT[incident.severity]} className="capitalize">
              {incident.severity}
            </Badge>
          </div>
          <DrawerDescription>
            {incident.camera} · {incident.timestamp}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-5">
          <div className="hud-panel flex aspect-video w-full items-center justify-center rounded-lg border border-border" style={{ backgroundColor: incident.thumbnailColor }}>
            <ImageOff className="h-8 w-8 text-white/15" />
          </div>

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Detection Details</h4>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <Field label="Worker" value={incident.worker} />
              <Field label="Site" value={incident.site} />
              <Field label="Missing PPE" value={incident.missingPpe.join(", ")} />
              <Field label="Confidence" value={`${(incident.confidence * 100).toFixed(1)}%`} />
              <Field label="Status" value={incident.status} className="capitalize" />
              <Field label="Assigned to" value={incident.assignedTo} />
            </dl>
            {incident.notes && (
              <p className="mt-2 rounded-md border border-border/70 bg-secondary/30 p-2.5 text-xs text-muted-foreground">{incident.notes}</p>
            )}
            {incident.resolution && (
              <p className="mt-2 rounded-md border border-success/25 bg-success/10 p-2.5 text-xs text-success">{incident.resolution}</p>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Action History</h4>
            <div className="relative ml-1 flex flex-col gap-3 border-l border-border pl-4">
              {incident.actionLog.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-detect" />
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{log.actor}</span> — {log.action}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{log.time}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Comments
            </h4>
            <div className="flex flex-col gap-2">
              {allComments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              {allComments.map((c) => (
                <div key={c.id} className="rounded-md border border-border/70 bg-secondary/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{c.author}</span>
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment…"
                className="h-9 flex-1 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="icon" className="h-9 w-9" onClick={handleAddComment}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          {onStatusChange && (
            <section>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Update Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((action) => {
                  const isCurrent = incident.status === action.status;
                  return (
                    <Button
                      key={action.status}
                      size="sm"
                      variant={action.status === "resolved" ? "detect" : "secondary"}
                      disabled={isCurrent || isUpdating}
                      onClick={() => void onStatusChange(action.status, action.resolution)}
                    >
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <action.icon className="h-3.5 w-3.5" />}
                      {isCurrent ? `Already ${action.label.toLowerCase()}d` : action.label}
                    </Button>
                  );
                })}
              </div>
            </section>
          )}

          <Button variant="secondary" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Download evidence package
          </Button>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={`font-medium text-foreground ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
