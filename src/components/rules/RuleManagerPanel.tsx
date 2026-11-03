import { useEffect, useState } from "react";
import {
  Eye,
  Footprints,
  Hand,
  HardHat,
  Shield,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ApiError, createRule, deleteRule, listRules, updateRule, type RuleConfig } from "@/lib/api-client";

const PPE_PRESETS: { label: string; ppe: string; icon: typeof HardHat }[] = [
  { label: "Helmet Required", ppe: "hardhat", icon: HardHat },
  { label: "Vest Required", ppe: "vest", icon: Shield },
  { label: "Gloves Required", ppe: "gloves", icon: Hand },
  { label: "Goggles Required", ppe: "goggles", icon: Eye },
  { label: "Boots Required", ppe: "boots", icon: Footprints },
  { label: "Mask Required", ppe: "mask", icon: ShieldAlert },
];

const SEVERITY_VARIANT = { critical: "danger", high: "default", medium: "detect", low: "secondary" } as const;

export function RuleManagerPanel() {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [confidence, setConfidence] = useState(50);
  const [debounce, setDebounce] = useState(10);
  const [alertDelay, setAlertDelay] = useState(0);
  const [shift, setShift] = useState<RuleConfig["shift"]>("all");

  function refresh() {
    setLoading(true);
    listRules()
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function createPreset(label: string, ppe: string) {
    try {
      const rule = await createRule({
        name: label,
        rule_type: "ppe_required",
        required_ppe: [ppe],
        severity: "high",
        is_active: true,
        confidence_threshold: confidence / 100,
        debounce_seconds: debounce,
        alert_delay_seconds: alertDelay,
        shift,
      });
      setRules((r) => [...r, rule]);
      toast({ title: "Rule created", description: `"${label}" is now active.` });
    } catch (err) {
      toast({ title: "Could not create rule", description: err instanceof ApiError ? err.message : "Backend unreachable.", variant: "destructive" });
    }
  }

  async function toggleActive(rule: RuleConfig) {
    try {
      const updated = await updateRule(rule.id, { is_active: !rule.is_active });
      setRules((r) => r.map((existing) => (existing.id === rule.id ? updated : existing)));
    } catch {
      toast({ title: "Could not update rule", variant: "destructive" });
    }
  }

  async function removeRule(rule: RuleConfig) {
    try {
      await deleteRule(rule.id);
      setRules((r) => r.filter((existing) => existing.id !== rule.id));
      toast({ title: "Rule deleted", description: `"${rule.name}" removed.` });
    } catch {
      toast({ title: "Could not delete rule", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">New Rule Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Confidence threshold</Label>
                <span className="font-mono text-xs text-muted-foreground">{confidence}%</span>
              </div>
              <Slider aria-label="Confidence threshold" min={0} max={100} step={5} value={[confidence]} onValueChange={([v]) => setConfidence(v)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Debounce (seconds)</Label>
                <span className="font-mono text-xs text-muted-foreground">{debounce}s</span>
              </div>
              <Slider aria-label="Debounce seconds" min={0} max={120} step={5} value={[debounce]} onValueChange={([v]) => setDebounce(v)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Alert delay (seconds)</Label>
                <span className="font-mono text-xs text-muted-foreground">{alertDelay}s</span>
              </div>
              <Slider aria-label="Alert delay seconds" min={0} max={120} step={5} value={[alertDelay]} onValueChange={([v]) => setAlertDelay(v)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>Shift</Label>
            <div className="w-40">
              <Select value={shift} onValueChange={(v) => setShift(v as RuleConfig["shift"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shifts</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="swing">Swing</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Quick-create PPE rules</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PPE_PRESETS.map((preset) => (
                <Button key={preset.ppe} size="sm" variant="secondary" onClick={() => void createPreset(preset.label, preset.ppe)}>
                  <preset.icon className="h-3.5 w-3.5" /> {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Rules</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No rules configured yet — create one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Name</th>
                    <th className="py-1.5 pr-2 font-medium">Type</th>
                    <th className="py-1.5 pr-2 font-medium">Shift</th>
                    <th className="py-1.5 pr-2 font-medium">Severity</th>
                    <th className="py-1.5 pr-2 font-medium">Confidence</th>
                    <th className="py-1.5 pr-2 font-medium">Debounce</th>
                    <th className="py-1.5 pr-2 font-medium">Active</th>
                    <th className="py-1.5 text-right font-medium">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-t border-border/60">
                      <td className="py-2 pr-2 font-medium text-foreground">{rule.name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{rule.rule_type.replace("_", " ")}</td>
                      <td className="py-2 pr-2 capitalize text-muted-foreground">{rule.shift}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={SEVERITY_VARIANT[rule.severity]} className="capitalize">
                          {rule.severity}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 font-mono text-muted-foreground">{Math.round(rule.confidence_threshold * 100)}%</td>
                      <td className="py-2 pr-2 font-mono text-muted-foreground">{rule.debounce_seconds}s</td>
                      <td className="py-2 pr-2">
                        <Switch checked={rule.is_active} onCheckedChange={() => void toggleActive(rule)} />
                      </td>
                      <td className="py-2 text-right">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-danger hover:text-danger" onClick={() => void removeRule(rule)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
