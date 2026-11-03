import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  FileText,
  Gauge,
  Globe,
  Info,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/shared/SectionCard";
import { ZoneManagerPanel } from "@/components/zones/ZoneManagerPanel";
import { RuleManagerPanel } from "@/components/rules/RuleManagerPanel";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { roleLabel } from "@/lib/auth";
import { getSettings, updateSettings, type SystemSettings } from "@/lib/api-client";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [name, setName] = useState(user?.full_name ?? user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [language, setLanguage] = useState("en");
  const [density, setDensity] = useState("comfortable");

  const [confidence, setConfidence] = useState(50);
  const [iou, setIou] = useState(45);
  const [tracker, setTracker] = useState("bytetrack");
  const [trackingAge, setTrackingAge] = useState(30);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState("medium");
  const [autoReports, setAutoReports] = useState(true);
  const [reportRecipients, setReportRecipients] = useState("safety-team@sentinel-ai.com");

  const [gpuAccel, setGpuAccel] = useState(true);
  const [maxCameras, setMaxCameras] = useState(64);
  const [saving, setSaving] = useState(false);

  // Keep profile fields in sync once the authenticated user resolves.
  useEffect(() => {
    if (user) {
      setName(user.full_name ?? user.username);
      setEmail(user.email);
    }
  }, [user]);

  // Hydrate detection / alerts / reports from the backend's persisted settings.
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (cancelled) return;
        setConfidence(Math.round(s.detection.confidence_threshold * 100));
        setIou(Math.round(s.detection.iou_threshold * 100));
        setTracker(s.detection.tracker);
        setTrackingAge(s.detection.max_tracking_age);
        setEmailAlerts(s.alerts.email_alerts);
        setPushAlerts(s.alerts.push_alerts);
        setSmsAlerts(s.alerts.sms_alerts);
        setAlertSeverity(s.alerts.min_severity);
        setAutoReports(s.reports.auto_generate_daily);
        if (s.reports.recipients.length) setReportRecipients(s.reports.recipients.join(", "));
      })
      .catch(() => {
        /* Backend unreachable — keep the designed defaults. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function composeSettings(): SystemSettings {
    return {
      detection: {
        confidence_threshold: confidence / 100,
        iou_threshold: iou / 100,
        tracker,
        max_tracking_age: trackingAge,
      },
      alerts: {
        email_alerts: emailAlerts,
        push_alerts: pushAlerts,
        sms_alerts: smsAlerts,
        min_severity: alertSeverity,
      },
      reports: {
        auto_generate_daily: autoReports,
        recipients: reportRecipients
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      },
    };
  }

  async function handleSave(section: string) {
    // Profile & appearance are client-side only (no backend fields yet);
    // detection / alerts / reports are persisted to /api/settings.
    const persisted = section === "Detection" || section === "Notifications";
    if (!persisted) {
      toast({ title: "Settings saved", description: `${section} preferences updated.` });
      return;
    }
    setSaving(true);
    try {
      await updateSettings(composeSettings());
      toast({ title: "Settings saved", description: `${section} preferences updated.` });
    } catch {
      toast({ variant: "destructive", title: "Save failed", description: "Could not reach the settings service." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure sites, cameras, alert thresholds, and user access.</p>
      </motion.div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile &amp; Appearance</TabsTrigger>
          <TabsTrigger value="detection">Detection</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="alerts">Alerts &amp; Reports</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="flex flex-col gap-4">
          <SectionCard
            title="User Profile"
            description="Your account details across the platform."
            icon={User}
            right={<Button size="sm" onClick={() => handleSave("Profile")}><Save className="h-3.5 w-3.5" /> Save</Button>}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} />
              <Field label="Work email" value={email} onChange={setEmail} type="email" />
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <div className="flex h-9 items-center rounded-md border border-border bg-secondary/30 px-3 text-xs text-muted-foreground">
                  {user ? roleLabel(user.role) : "—"}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Access level</Label>
                <Badge variant="detect" className="w-fit font-sans normal-case">Administrator</Badge>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Appearance" description="Personalize how Sentinel looks for you." icon={Palette}>
            <ToggleRow label="Dark mode" description="Cyber Noir dark theme (recommended for monitoring rooms)." checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Layout density</p>
                <p className="text-[11px] text-muted-foreground">Adjust spacing across tables and cards.</p>
              </div>
              <div className="w-40">
                <Select value={density} onValueChange={setDensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Language &amp; Region" icon={Globe}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Interface language</p>
                <p className="text-[11px] text-muted-foreground">Applies to labels, dates, and generated reports.</p>
              </div>
              <div className="w-40">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="detection" className="flex flex-col gap-4">
          <SectionCard
            title="Detection Thresholds"
            description="Tune how aggressively the model flags detections."
            icon={Gauge}
            right={<Button size="sm" disabled={saving} onClick={() => void handleSave("Detection")}><Save className="h-3.5 w-3.5" /> Save</Button>}
          >
            <SliderRow label="Confidence threshold" value={confidence} onChange={setConfidence} suffix="%" />
            <SliderRow label="IOU threshold" value={iou} onChange={setIou} suffix="%" />
          </SectionCard>

          <SectionCard title="Tracker Settings" icon={Shield}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Object tracker</p>
                <p className="text-[11px] text-muted-foreground">Algorithm used to persist IDs across frames.</p>
              </div>
              <div className="w-40">
                <Select value={tracker} onValueChange={setTracker}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bytetrack">ByteTrack</SelectItem>
                    <SelectItem value="deepsort">DeepSORT</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SliderRow label="Max tracking age (frames)" value={trackingAge} onChange={setTrackingAge} max={120} />
          </SectionCard>

          <SectionCard title="Performance" icon={Gauge}>
            <ToggleRow label="GPU acceleration" description="Use CUDA / TensorRT for inference when available." checked={gpuAccel} onChange={setGpuAccel} />
            <SliderRow label="Max concurrent camera streams" value={maxCameras} onChange={setMaxCameras} max={128} suffix="" />
          </SectionCard>
        </TabsContent>

        <TabsContent value="zones" className="flex flex-col gap-4">
          <ZoneManagerPanel />
        </TabsContent>

        <TabsContent value="rules" className="flex flex-col gap-4">
          <RuleManagerPanel />
        </TabsContent>

        <TabsContent value="alerts" className="flex flex-col gap-4">
          <SectionCard
            title="Notification Settings"
            description="Choose how you're notified of new incidents."
            icon={Bell}
            right={<Button size="sm" disabled={saving} onClick={() => void handleSave("Notifications")}><Save className="h-3.5 w-3.5" /> Save</Button>}
          >
            <ToggleRow label="Email alerts" description="Receive incident summaries by email." checked={emailAlerts} onChange={setEmailAlerts} />
            <ToggleRow label="Push notifications" description="Real-time alerts in the browser and mobile app." checked={pushAlerts} onChange={setPushAlerts} />
            <ToggleRow label="SMS alerts" description="Critical incidents only, sent via text message." checked={smsAlerts} onChange={setSmsAlerts} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Minimum severity to notify</p>
                <p className="text-[11px] text-muted-foreground">Lower-severity events are logged silently.</p>
              </div>
              <div className="w-36">
                <Select value={alertSeverity} onValueChange={setAlertSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low &amp; above</SelectItem>
                    <SelectItem value="medium">Medium &amp; above</SelectItem>
                    <SelectItem value="high">High &amp; above</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Report Settings" icon={FileText}>
            <ToggleRow label="Auto-generate daily reports" description="A daily safety report is generated every morning at 06:00." checked={autoReports} onChange={setAutoReports} />
            <Field label="Report recipients" value={reportRecipients} onChange={setReportRecipients} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="audit" className="flex flex-col gap-4">
          <AuditLogPanel />
        </TabsContent>

        <TabsContent value="system" className="flex flex-col gap-4">
          <SectionCard title="Camera Settings" icon={Camera}>
            <div className="flex flex-col gap-2">
              {["CAM-01 · Loading Dock", "CAM-04 · Assembly Line 2", "CAM-07 · Warehouse East"].map((cam) => (
                <div key={cam} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-secondary/20 px-3 py-2.5">
                  <span className="text-xs text-foreground">{cam}</span>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="1080p">
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="30">
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 fps</SelectItem>
                        <SelectItem value="30">30 fps</SelectItem>
                        <SelectItem value="60">60 fps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="System Information" icon={Info}>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              {(
                [
                  ["Browser threads", String(navigator.hardwareConcurrency || "—")],
                  ["Platform", navigator.platform || "—"],
                  ["Language", navigator.language],
                  ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{key}</dt>
                  <dd className="font-mono text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="About Software" icon={Info}>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Version</dt>
                <dd className="font-mono text-foreground">Sentinel v2.4.0</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Build</dt>
                <dd className="font-mono text-foreground">2026.06.30-rc2</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">License</dt>
                <dd className="font-mono text-foreground">Enterprise</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Support</dt>
                <dd className="font-mono text-foreground">24/7 · Tier 1</dd>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderRow({ label, value, onChange, max = 100, suffix = "%" }: { label: string; value: number; onChange: (v: number) => void; max?: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider aria-label={label} min={0} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
