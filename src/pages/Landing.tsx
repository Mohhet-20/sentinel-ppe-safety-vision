import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Camera,
  Check,
  Cpu,
  FileText,
  Github,
  HardHat,
  KeyRound,
  Layers,
  Linkedin,
  Loader2,
  Lock,
  Radio,
  ScanEye,
  ShieldAlert,
  ShieldHalf,
  TestTube2,
  Video,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroViewer } from "@/components/landing/HeroViewer";
import { TryItLive } from "@/components/landing/TryItLive";
import { useLaunchDemo } from "@/hooks/use-launch-demo";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" },
} as const;

const STATS = [
  { value: "0.744", label: "mAP@50 on PPE benchmark" },
  { value: "10", label: "PPE & hazard classes" },
  { value: "57", label: "typed REST endpoints" },
  { value: "100", label: "Lighthouse accessibility" },
];

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  accent?: "hazard" | "detect" | "danger" | "success";
}

const FEATURES: Feature[] = [
  {
    icon: ScanEye,
    title: "Three ways in, one pipeline",
    body: "Images, uploaded video and live webcam all flow through the same InferenceService, so a model swap upgrades every surface at once.",
    className: "md:col-span-2",
    accent: "detect",
  },
  {
    icon: ShieldAlert,
    title: "Violations become incidents",
    body: "Missing hard hats or vests become severity-ranked incidents, deduplicated per track, so 300 frames of one person yield one ticket.",
    accent: "danger",
  },
  {
    icon: Radio,
    title: "Real-time command center",
    body: "One shared WebSocket per session pushes detections, incidents and telemetry to every open widget.",
    accent: "hazard",
  },
  {
    icon: Layers,
    title: "Zones & rules",
    body: "Draw polygons over a camera view and require PPE per zone. Each worker is checked against the PPE they are wearing, not what's elsewhere in frame.",
  },
  {
    icon: BarChart3,
    title: "Analytics that drive action",
    body: "Compliance trends, worker risk ranking, camera hot-spots and one-click CSV / Excel / PDF reports.",
    className: "md:col-span-2",
    accent: "success",
  },
  {
    icon: Lock,
    title: "Enterprise security",
    body: "JWT access + refresh tokens, bcrypt, four RBAC roles and a full audit trail of every privileged action.",
  },
  {
    icon: Cpu,
    title: "Hot-swappable models",
    body: "Drop a new Ultralytics checkpoint in place; it's picked up on the next request with no restart and no code change.",
  },
];

const PIPELINE: { icon: LucideIcon; title: string; file: string }[] = [
  { icon: Camera, title: "Capture", file: "image · video · webcam" },
  { icon: Cpu, title: "Detect", file: "inference_service.py" },
  { icon: Boxes, title: "Track", file: "tracker_service.py" },
  { icon: Workflow, title: "Evaluate", file: "ppe_incident_rules.py" },
  { icon: ShieldAlert, title: "Raise incident", file: "incident_service.py" },
  { icon: Radio, title: "Broadcast", file: "websocket/broadcaster.py" },
];

const STACK: { group: string; items: string[] }[] = [
  { group: "Frontend", items: ["React 19", "TypeScript", "Vite", "TanStack Query", "Tailwind + Radix", "Framer Motion", "Recharts"] },
  { group: "Backend", items: ["FastAPI", "SQLAlchemy 2", "Pydantic v2", "Alembic", "WebSockets", "JWT + bcrypt", "pytest"] },
  { group: "Computer vision", items: ["Ultralytics YOLOv8", "OpenCV", "ONNX", "onnxruntime-web", "IoU tracking"] },
  { group: "Delivery", items: ["Docker Compose", "nginx", "GitHub Actions", "Vercel"] },
];

const ENGINEERING = [
  "Typed end-to-end: Pydantic schemas on the server mirror TypeScript interfaces on the client",
  "Thin routes, fat services: business logic is unit-testable without HTTP",
  "Silent token refresh with a single retry, then a clean logout",
  "Production guardrails: the API refuses to boot with default credentials",
  "Route-level code splitting: this page never downloads the dashboard",
  "Same violation and zone rules in Python and TypeScript, held to one shared test spec",
  "Lighthouse desktop: 95 performance, 100 accessibility, best practices and SEO",
];

const CODE = `def classify_violation(class_name: str):
    """'NO-Hardhat' -> ('Missing Helmet', HIGH)"""
    tokens = set(normalize(class_name).split("-"))
    for keywords, label, severity in _VIOLATION_RULES:
        if all(any(k in t for t in tokens) for k in keywords):
            return label, severity
    return None`;

export default function Landing() {
  const { launch, launching } = useLaunchDemo();

  const DemoButton = ({ size = "lg", className }: { size?: "lg" | "default"; className?: string }) => (
    <Button size={size} onClick={() => void launch()} disabled={launching} className={cn("group", className)}>
      {launching ? <Loader2 className="animate-spin" /> : <Activity />}
      Launch live demo
      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
    </Button>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/15">
              <ShieldHalf className="h-4 w-4 text-primary" strokeWidth={2.25} />
            </span>
            <span className="font-display text-base font-bold tracking-[0.12em]">SENTINEL</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#playground" className="hover:text-foreground">Try the model</a>
            <a href="#features" className="hover:text-foreground">Platform</a>
            <a href="#pipeline" className="hover:text-foreground">How it works</a>
            <a href="#engineering" className="hover:text-foreground">Engineering</a>
          </nav>
          <div className="flex items-center gap-2">
            {SITE.repoUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a href={SITE.repoUrl} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
                  <Github />
                </a>
              </Button>
            )}
            <DemoButton size="default" className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-ambient opacity-80" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-detect/30 bg-detect/10 px-3 py-1 font-mono text-[11px] text-detect">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-detect" />
              Real YOLOv8 model · running in your browser
            </span>
            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
              Every hard hat.
              <br />
              Every frame.
              <br />
              <span className="bg-gradient-to-r from-primary via-amber-300 to-detect bg-clip-text text-transparent">Every site.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Sentinel is a full-stack computer-vision platform that spots missing protective equipment in images, video and
              live cameras, turns each violation into a tracked incident, and streams it to a real-time safety command center.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DemoButton />
              <Button size="lg" variant="outline" asChild>
                <a href="#playground">
                  <ScanEye /> Run the model now
                </a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["No sign-up", "Nothing leaves your device", "Full product, not a mock-up"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-success" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <HeroViewer />
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- stats */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border px-4 sm:px-6 md:grid-cols-4 md:divide-x">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="px-2 py-8 text-center md:px-6">
              <p className="font-display text-4xl font-bold tabular-nums text-foreground sm:text-5xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- playground */}
      <Section
        id="playground"
        eyebrow="Interactive"
        title="Don't take our word for it. Run the model."
        lede="This is the production checkpoint exported to ONNX and executed with WebAssembly. Pick a sample, drop in your own photo, or point your webcam at a hard hat."
      >
        <TryItLive />
      </Section>

      {/* -------------------------------------------------------- features */}
      <Section
        id="features"
        eyebrow="Platform"
        title="From pixels to a closed safety ticket"
        lede="Fourteen product modules covering the whole loop: detection, triage, analytics and administration."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...reveal}
              transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors hover:border-muted-foreground/40",
                f.className,
              )}
            >
              <div
                className={cn(
                  "absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-100",
                  f.accent === "detect" && "bg-detect/15",
                  f.accent === "danger" && "bg-danger/15",
                  f.accent === "success" && "bg-success/15",
                  (!f.accent || f.accent === "hazard") && "bg-primary/15",
                )}
              />
              <f.icon
                className={cn(
                  "h-6 w-6",
                  f.accent === "detect" ? "text-detect" : f.accent === "danger" ? "text-danger" : f.accent === "success" ? "text-success" : "text-primary",
                )}
              />
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
          <motion.div {...reveal} className="flex flex-col justify-between rounded-xl border border-dashed border-border p-6">
            <div className="flex gap-3 text-muted-foreground">
              <Video className="h-5 w-5" />
              <Bell className="h-5 w-5" />
              <FileText className="h-5 w-5" />
              <HardHat className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Plus worker profiles, system health, user management and an audit log, all in the live demo.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* -------------------------------------------------------- pipeline */}
      <Section
        id="pipeline"
        eyebrow="How it works"
        title="One pipeline, six stages, zero glue scripts"
        lede="Each stage is a single service with a single job. Here's the path a frame takes, with the file that owns each step."
      >
        <div className="relative">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          <motion.div
            className="absolute top-[26px] hidden h-[3px] w-24 rounded-full bg-gradient-to-r from-transparent via-detect to-transparent lg:block"
            animate={{ left: ["0%", "92%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <ol className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((step, i) => (
              <motion.li key={step.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card shadow-panel">
                  <step.icon className="h-6 w-6 text-primary" />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary font-mono text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                </span>
                <p className="mt-4 font-display text-lg font-semibold">{step.title}</p>
                <code className="mt-1 font-mono text-[11px] text-muted-foreground">{step.file}</code>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-4">
          {STACK.map((s, i) => (
            <motion.div key={s.group} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.group}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.items.map((item) => (
                  <span key={item} className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------ engineering */}
      <Section
        id="engineering"
        eyebrow="Engineering"
        title="Built like production software"
        lede="The interesting part isn't the model call. It's everything around it that makes the system trustworthy."
      >
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <ul className="flex flex-col gap-3">
            {ENGINEERING.map((item, i) => (
              <motion.li key={item} {...reveal} transition={{ ...reveal.transition, delay: i * 0.05 }} className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <Check className="h-3 w-3 text-success" />
                </span>
                {item}
              </motion.li>
            ))}
          </ul>

          <motion.div {...reveal} className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117]">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">backend/app/services/ppe_incident_rules.py</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[#c9d1d9]">
                <code>{CODE}</code>
              </pre>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={TestTube2} value="105" label="automated tests" />
              <MiniStat icon={KeyRound} value="4" label="RBAC roles" />
              <MiniStat icon={Activity} value="CI" label="on every push" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- cta */}
      <section className="px-4 pb-24 sm:px-6">
        <motion.div
          {...reveal}
          className="hud-panel relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-ambient opacity-70" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">See the whole platform in 30 seconds</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Dashboard, incident triage, video analysis, live webcam, analytics and admin, pre-loaded with a realistic site.
              One click, no account.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <DemoButton />
              {SITE.repoUrl && (
                <Button size="lg" variant="outline" asChild>
                  <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
                    <Github /> Read the code
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            {SITE.name} · {SITE.tagline}
            {SITE.author && <> · Designed &amp; built by <span className="text-foreground">{SITE.author}</span></>}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground">Sign in to a backend</Link>
            {SITE.repoUrl && (
              <a href={SITE.repoUrl} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
            )}
            {SITE.linkedinUrl && (
              <a href={SITE.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-foreground" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <p className="pb-6 text-center text-[10px] text-muted-foreground/70">Sample photography from Pexels (Pexels License).</p>
      </footer>
    </div>
  );
}

function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...reveal} className="mb-12 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{lede}</p>
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
