import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ScanEye,
  Video,
  Radio,
  BarChart3,
  ShieldAlert,
  Users,
  FileText,
  Cpu,
  Settings,
  Server,
  Info,
} from "lucide-react";

/** The authenticated product lives under /app; "/" is the public landing page. */
export const APP_HOME = "/app";

export interface NavEntry {
  label: string;
  path: string;
  icon: LucideIcon;
  section: "monitor" | "operate" | "system";
}

export const NAV_ENTRIES: NavEntry[] = [
  { label: "Dashboard", path: APP_HOME, icon: LayoutDashboard, section: "monitor" },
  { label: "Image Detection", path: "/app/detection/image", icon: ScanEye, section: "monitor" },
  { label: "Video Detection", path: "/app/detection/video", icon: Video, section: "monitor" },
  { label: "Live Webcam", path: "/app/detection/live", icon: Radio, section: "monitor" },
  { label: "Analytics", path: "/app/analytics", icon: BarChart3, section: "operate" },
  { label: "Incident Center", path: "/app/incidents", icon: ShieldAlert, section: "operate" },
  { label: "Workers", path: "/app/workers", icon: Users, section: "operate" },
  { label: "Reports", path: "/app/reports", icon: FileText, section: "operate" },
  { label: "Model Manager", path: "/app/models", icon: Cpu, section: "system" },
  { label: "System Health", path: "/app/system", icon: Server, section: "system" },
  { label: "Settings", path: "/app/settings", icon: Settings, section: "system" },
  { label: "User Management", path: "/app/settings/users", icon: Users, section: "system" },
  { label: "About", path: "/app/about", icon: Info, section: "system" },
];

export const NAV_SECTIONS: Record<NavEntry["section"], string> = {
  monitor: "Monitor",
  operate: "Operate",
  system: "System",
};
