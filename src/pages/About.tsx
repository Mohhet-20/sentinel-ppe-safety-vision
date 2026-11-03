import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  Sparkles,
  HardHat,
  ScanEye,
  Camera,
  Video,
  Image as ImageIcon,
  Grid2x2,
  MapPinned,
  AlertOctagon,
  Bell,
  BarChart3,
  FileText,
  Users,
  Lock,
  ArrowDown,
  Building2,
  Factory,
  Warehouse,
  Mountain,
  Fuel,
  Cpu,
  Database,
  Server,
  Rocket,
  Satellite,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Thermometer,
  FileCheck,
  Gauge,
  Layers,
  Workflow,
  Info,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const APP_VERSION = "0.1.0";

interface FeatureEntry {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: FeatureEntry[] = [
  { icon: HardHat, title: "PPE Detection", description: "Detects hardhats, safety vests, masks, and other protective equipment, flagging any worker missing required gear." },
  { icon: Video, title: "Real-Time Webcam Monitoring", description: "Streams a live browser camera feed directly into the AI pipeline for continuous, real-time compliance monitoring." },
  { icon: ScanEye, title: "Video Analysis", description: "Processes uploaded footage frame-by-frame with persistent object tracking, so a single violation is never counted twice." },
  { icon: ImageIcon, title: "Image Upload Detection", description: "Runs instant PPE detection on any uploaded photo, complete with annotated bounding boxes and confidence scores." },
  { icon: Grid2x2, title: "Multi-Camera Monitoring", description: "Manage and monitor multiple camera feeds across sites from a single, unified view." },
  { icon: MapPinned, title: "Zone-Based Safety Rules", description: "Define custom zones with their own required PPE and risk level, tailored to how each site actually operates." },
  { icon: AlertOctagon, title: "Incident Management", description: "Every detected violation becomes a trackable incident, complete with severity, evidence, and resolution status." },
  { icon: Bell, title: "Live Alerts", description: "Get notified the moment a violation is detected, pushed in real time over a live WebSocket connection." },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track compliance trends, worker risk rankings, and camera-level performance in one live analytics view." },
  { icon: FileText, title: "AI Reports", description: "Generate downloadable CSV, Excel, and PDF safety reports built directly from live incident data." },
  { icon: Users, title: "User & Role Management", description: "Administer accounts with role-based access control for admins, safety leads, supervisors, and viewers." },
  { icon: Lock, title: "Secure Enterprise Authentication", description: "JWT-based authentication with access and refresh tokens keeps every session secure." },
];

interface FlowStep {
  icon: LucideIcon;
  label: string;
}

const AI_PIPELINE: FlowStep[] = [
  { icon: Camera, label: "Camera / Image / Video" },
  { icon: Cpu, label: "AI Detection Engine" },
  { icon: HardHat, label: "PPE Classification" },
  { icon: Workflow, label: "Rule Engine" },
  { icon: AlertOctagon, label: "Violation Detection" },
  { icon: FileCheck, label: "Incident Creation" },
  { icon: BarChart3, label: "Dashboard & Reports" },
];

const SYSTEM_ARCHITECTURE: FlowStep[] = [
  { icon: Camera, label: "Cameras" },
  { icon: Layers, label: "Frontend" },
  { icon: Server, label: "FastAPI Backend" },
  { icon: Cpu, label: "AI Detection Engine" },
  { icon: Database, label: "Database" },
  { icon: BarChart3, label: "Dashboard & Reports" },
];

interface TechGroup {
  title: string;
  items: string[];
}

const TECH_STACK: TechGroup[] = [
  { title: "Frontend", items: ["React", "TypeScript", "Tailwind CSS", "Vite"] },
  { title: "Backend", items: ["FastAPI", "Python", "SQLAlchemy", "SQLite"] },
  { title: "AI", items: ["Ultralytics YOLO", "OpenCV", "PyTorch"] },
  { title: "Deployment", items: ["Docker", "Nginx"] },
];

interface ApplicationEntry {
  icon: LucideIcon;
  title: string;
  description: string;
}

const APPLICATIONS: ApplicationEntry[] = [
  { icon: Building2, title: "Construction Sites", description: "Monitor hardhat and vest compliance across active, ever-changing job sites." },
  { icon: Factory, title: "Manufacturing Plants", description: "Track PPE compliance on production floors with heavy machinery and moving parts." },
  { icon: Warehouse, title: "Warehouses", description: "Watch high-traffic loading docks and storage zones for consistent safety compliance." },
  { icon: Mountain, title: "Mining", description: "Extend monitoring to demanding, high-risk extraction and processing environments." },
  { icon: Fuel, title: "Oil & Gas", description: "Support strict PPE and zone-safety requirements across refining and field operations." },
  { icon: Cpu, title: "Smart Factories", description: "Integrate AI safety monitoring into automated, sensor-driven production environments." },
];

interface BenefitEntry {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BENEFITS: BenefitEntry[] = [
  { icon: ShieldCheck, title: "Increased Worker Safety", description: "Continuous, automated monitoring catches PPE gaps a human patrol could easily miss." },
  { icon: TrendingDown, title: "Reduced Accidents", description: "Catching non-compliance early lowers the odds it turns into an injury." },
  { icon: FileCheck, title: "Regulatory Compliance", description: "Auditable incident records and reports support safety and regulatory documentation." },
  { icon: Gauge, title: "Faster Incident Response", description: "Live alerts mean safety officers hear about a violation in seconds, not at end of shift." },
  { icon: BarChart3, title: "Better Operational Visibility", description: "Site-wide analytics turn scattered observations into one clear compliance picture." },
  { icon: Sparkles, title: "AI-Assisted Monitoring", description: "AI handles continuous watching, freeing safety personnel to focus on the response." },
];

interface FutureEntry {
  icon: LucideIcon;
  title: string;
}

const FUTURE_ENHANCEMENTS: FutureEntry[] = [
  { icon: Sparkles, title: "Custom AI Model Training" },
  { icon: Cpu, title: "Edge AI Deployment" },
  { icon: Thermometer, title: "Thermal Cameras" },
  { icon: Satellite, title: "Drone Surveillance" },
  { icon: Smartphone, title: "Mobile Application" },
  { icon: TrendingUp, title: "Predictive Safety Analytics" },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div {...fadeUp} className="mb-5 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="font-display text-xl font-bold tracking-wide text-foreground lg:text-2xl">{title}</h2>
      {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </motion.div>
  );
}

function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-col items-center gap-1.5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.06 }}
            className="hud-panel relative flex w-full max-w-md items-center gap-3 rounded-lg border border-detect/25 bg-detect/[0.05] px-4 py-3"
            style={{ ["--corner-color" as string]: "var(--detect)" }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-detect/15">
              <step.icon className="h-4.5 w-4.5 text-detect" />
            </span>
            <p className="text-sm font-semibold text-foreground">{step.label}</p>
          </motion.div>
          {i < steps.length - 1 && <ArrowDown className="h-4 w-4 text-muted-foreground/50" />}
        </div>
      ))}
    </div>
  );
}

export default function About() {
  return (
    <div className="flex flex-col gap-12 pb-8">
      {/* 1. Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="hud-panel relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-8 text-center shadow-panel lg:p-12"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-detect/10 blur-3xl" />
          <motion.div
            className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-detect/5 to-transparent"
            initial={{ top: "-30%" }}
            animate={{ top: "130%" }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <ShieldCheck className="h-8 w-8 text-primary" strokeWidth={1.75} />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-success shadow-glow-detect" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-foreground lg:text-4xl">
              Sentinel AI Workplace Safety Platform
            </h1>
            <p className="mt-2 font-display text-sm font-semibold uppercase tracking-[0.16em] text-detect lg:text-base">
              AI-Powered PPE Detection &amp; Workplace Safety Monitoring
            </p>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
            Sentinel is a full-stack, AI-driven workplace safety platform that continuously monitors personal
            protective equipment (PPE) compliance across images, video, and live camera feeds. Built on a real
            Ultralytics YOLO detection pipeline, it turns raw camera footage into actionable safety intelligence —
            automatically flagging violations, generating incidents, and giving safety officers a real-time view of
            compliance across every site they oversee.
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="detect">
              <Sparkles className="h-3 w-3" /> Real Ultralytics YOLO Inference
            </Badge>
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3" /> Enterprise Authentication
            </Badge>
            <Badge variant="default">
              <Bell className="h-3 w-3" /> Real-Time Alerts
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* 2. Mission */}
      <section>
        <SectionHeading eyebrow="Why Sentinel Exists" title="Our Mission" />
        <motion.div {...fadeUp}>
          <Card className="hud-panel relative overflow-hidden border-primary/20" style={{ ["--corner-color" as string]: "var(--hazard)" }}>
            <CardContent className="p-6 lg:p-7">
              <p className="text-sm leading-relaxed text-foreground/90 lg:text-base">
                Industrial workplaces generate more visual safety signal than any human patrol can consistently watch —
                every camera, every shift, every worker. Sentinel puts computer vision to work where manual observation
                can&rsquo;t scale: continuously scanning camera feeds for missing hardhats, vests, and other required
                PPE, and turning what it sees into an immediate, actionable signal instead of a missed opportunity.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90 lg:text-base">
                By automating detection, Sentinel helps reduce the accidents that come from unnoticed non-compliance,
                shortens the time between a violation occurring and a safety officer knowing about it, and gives safety
                teams a live, evidence-backed record instead of end-of-shift guesswork. The goal isn&rsquo;t to replace
                the people responsible for site safety — it&rsquo;s to give them better eyes everywhere at once.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* 3. Key Features */}
      <section>
        <SectionHeading
          eyebrow="Platform Capabilities"
          title="Key Features"
          description="Everything needed to detect, track, and act on PPE compliance — from a single photo to a live multi-camera deployment."
        />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: (i % 6) * 0.05 }}
            >
              <Card className="h-full transition-colors hover:border-primary/30 hover:bg-secondary/20">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12">
                    <feature.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold tracking-wide text-foreground">{feature.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. AI Pipeline */}
      <section>
        <SectionHeading
          eyebrow="How Detection Works"
          title="AI Pipeline"
          description="Every image, video frame, and live webcam snapshot flows through the same detection-to-report pipeline."
        />
        <Card className="border-detect/20 bg-secondary/10 p-6 lg:p-8">
          <FlowDiagram steps={AI_PIPELINE} />
        </Card>
      </section>

      {/* 5. Technologies Used */}
      <section>
        <SectionHeading eyebrow="Under the Hood" title="Technologies Used" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {TECH_STACK.map((group, i) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.06 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-detect">{group.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. Industrial Applications */}
      <section>
        <SectionHeading
          eyebrow="Where It Fits"
          title="Industrial Applications"
          description="Designed for any environment where PPE compliance is safety-critical."
        />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {APPLICATIONS.map((app, i) => (
            <motion.div
              key={app.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: (i % 6) * 0.05 }}
            >
              <Card className="h-full transition-colors hover:border-detect/30 hover:bg-secondary/20">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-detect/12">
                    <app.icon className="h-5 w-5 text-detect" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold tracking-wide text-foreground">{app.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{app.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 7. Benefits */}
      <section>
        <SectionHeading eyebrow="The Outcome" title="Benefits" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: (i % 6) * 0.05 }}
            >
              <Card className="h-full border-success/20">
                <CardContent className="flex h-full items-start gap-3 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/12">
                    <benefit.icon className="h-4.5 w-4.5 text-success" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold tracking-wide text-foreground">{benefit.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{benefit.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 8. System Architecture */}
      <section>
        <SectionHeading
          eyebrow="End-to-End"
          title="System Architecture"
          description="A straightforward path from camera to insight — no hidden layers, no black boxes."
        />
        <Card className="border-primary/20 bg-secondary/10 p-6 lg:p-8">
          <FlowDiagram steps={SYSTEM_ARCHITECTURE} />
        </Card>
      </section>

      {/* 9. Future Enhancements */}
      <section>
        <SectionHeading
          eyebrow="What's Next"
          title="Future Enhancements"
          description="The platform roadmap beyond its current foundation."
        />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE_ENHANCEMENTS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: (i % 6) * 0.05 }}
            >
              <Card className="h-full border-dashed">
                <CardContent className="flex h-full items-center gap-3 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted-foreground/10">
                    <item.icon className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.75} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    <Rocket className="h-2.5 w-2.5" /> Roadmap
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 10. Footer */}
      <motion.div {...fadeUp}>
        <Card className="border-border bg-secondary/20">
          <CardContent className="flex flex-col gap-4 p-6 text-center lg:p-7">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="font-mono">v{APP_VERSION}</Badge>
              <Badge variant="secondary">Enterprise AI Workplace Safety Platform</Badge>
            </div>
            <div className="mx-auto flex max-w-xl items-start gap-2.5 rounded-lg border border-border bg-background/40 px-4 py-3 text-left">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sentinel is an AI-assisted monitoring tool designed to support workplace safety personnel — it does
                not replace human supervision, judgment, or responsibility for on-site safety decisions. Detection
                results should always be reviewed and acted upon by qualified safety personnel.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
