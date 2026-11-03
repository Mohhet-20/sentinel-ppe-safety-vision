import { useEffect, useState } from "react";
import { Save, Shapes, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ApiError,
  createZone,
  deleteZone,
  listCameras,
  listZones,
  updateZone,
  type CameraSummary,
  type Zone,
  type ZonePoint,
} from "@/lib/api-client";
import { ZonePolygonEditor } from "@/components/zones/ZonePolygonEditor";

const PPE_OPTIONS = ["hardhat", "vest", "goggles", "gloves", "boots", "mask"];
const ZONE_TYPES = [
  { value: "safe", label: "Safe Zone" },
  { value: "restricted", label: "Restricted Zone" },
  { value: "danger", label: "Danger Zone" },
  { value: "mandatory_ppe", label: "Mandatory PPE Zone" },
] as const;

const ZONE_TYPE_BADGE: Record<string, "success" | "default" | "danger" | "detect"> = {
  safe: "success",
  restricted: "default",
  danger: "danger",
  mandatory_ppe: "detect",
};

const emptyForm = {
  name: "",
  zone_type: "safe" as Zone["zone_type"],
  requiredPpe: [] as string[],
  priority: 2,
  polygon: [] as ZonePoint[],
};

export function ZoneManagerPanel() {
  const { toast } = useToast();
  const [cameras, setCameras] = useState<CameraSummary[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listCameras()
      .then((list) => {
        setCameras(list);
        if (list.length > 0) setSelectedCamera(list[0].id);
      })
      .catch(() => setCameras([]));
  }, []);

  useEffect(() => {
    if (!selectedCamera) return;
    setLoading(true);
    listZones(selectedCamera)
      .then(setZones)
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, [selectedCamera]);

  function togglePpe(ppe: string) {
    setForm((f) => ({
      ...f,
      requiredPpe: f.requiredPpe.includes(ppe) ? f.requiredPpe.filter((p) => p !== ppe) : [...f.requiredPpe, ppe],
    }));
  }

  async function handleSave() {
    if (!selectedCamera) return;
    if (!form.name.trim()) {
      toast({ title: "Zone name required", variant: "destructive" });
      return;
    }
    if (form.polygon.length < 3) {
      toast({ title: "Draw at least 3 points", description: "A zone polygon needs at least 3 vertices.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createZone({
        camera_id: selectedCamera,
        name: form.name,
        zone_type: form.zone_type,
        polygon: form.polygon,
        required_ppe: form.requiredPpe,
        priority: form.priority,
        is_active: true,
      });
      setZones((z) => [...z, created]);
      setForm(emptyForm);
      toast({ title: "Zone saved", description: `"${created.name}" created and stored in the database.` });
    } catch (err) {
      toast({ title: "Could not save zone", description: err instanceof ApiError ? err.message : "Backend unreachable.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(zone: Zone) {
    try {
      const updated = await updateZone(zone.id, { is_active: !zone.is_active });
      setZones((z) => z.map((existing) => (existing.id === zone.id ? updated : existing)));
    } catch {
      toast({ title: "Could not update zone", variant: "destructive" });
    }
  }

  async function handleDelete(zone: Zone) {
    try {
      await deleteZone(zone.id);
      setZones((z) => z.filter((existing) => existing.id !== zone.id));
      toast({ title: "Zone deleted", description: `"${zone.name}" removed.` });
    } catch {
      toast({ title: "Could not delete zone", variant: "destructive" });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shapes className="h-4 w-4 text-primary" />
            Draw New Zone
          </CardTitle>
          <div className="w-52">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger>
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((cam) => (
                  <SelectItem key={cam.id} value={cam.id}>
                    {cam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-1">
          <ZonePolygonEditor
            points={form.polygon}
            onChange={(polygon) => setForm((f) => ({ ...f, polygon }))}
            zoneType={form.zone_type}
            existingZones={zones}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Zone name</Label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Forklift Lane"
                className="h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Zone type</Label>
              <Select value={form.zone_type} onValueChange={(v) => setForm((f) => ({ ...f, zone_type: v as Zone["zone_type"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map((zt) => (
                    <SelectItem key={zt.value} value={zt.value}>
                      {zt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Required PPE in this zone</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PPE_OPTIONS.map((ppe) => (
                <label key={ppe} className="flex items-center gap-2 text-xs text-foreground">
                  <Checkbox checked={form.requiredPpe.includes(ppe)} onCheckedChange={() => togglePpe(ppe)} />
                  <span className="capitalize">{ppe}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Priority</Label>
              <span className="font-mono text-xs text-muted-foreground">{form.priority}</span>
            </div>
            <Slider aria-label="Zone priority" min={1} max={5} step={1} value={[form.priority]} onValueChange={([v]) => setForm((f) => ({ ...f, priority: v }))} />
          </div>

          <Button onClick={() => void handleSave()} disabled={saving || !selectedCamera}>
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save zone"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Zones on this camera</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-1">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : zones.length === 0 ? (
            <p className="text-xs text-muted-foreground">No zones configured for this camera yet.</p>
          ) : (
            zones.map((zone) => (
              <div key={zone.id} className="rounded-md border border-border/70 bg-secondary/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-foreground">{zone.name}</span>
                  <Badge variant={ZONE_TYPE_BADGE[zone.zone_type]} className="shrink-0 capitalize">
                    {zone.zone_type.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {zone.required_ppe.length > 0 ? `Requires: ${zone.required_ppe.join(", ")}` : "No PPE required"} · Priority {zone.priority}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => void handleToggleActive(zone)}>
                    {zone.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-danger hover:text-danger" onClick={() => void handleDelete(zone)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
