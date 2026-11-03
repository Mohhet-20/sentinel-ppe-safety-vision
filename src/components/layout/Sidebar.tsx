import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, ShieldHalf } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_HOME, NAV_ENTRIES, NAV_SECTIONS, type NavEntry } from "@/constants/nav";
import { useAuth } from "@/providers/AuthProvider";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SECTION_ORDER: NavEntry["section"][] = ["monitor", "operate", "system"];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-sm transition-[width] duration-200 ease-out",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2.5 px-5", collapsed && "justify-center px-0")}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15">
          <ShieldHalf className="h-4.5 w-4.5 text-primary" strokeWidth={2.25} />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-success shadow-glow-detect" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-[0.08em] text-foreground">SENTINEL</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Safety AI</p>
          </div>
        )}
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTION_ORDER.map((section, idx) => (
          <div key={section} className={cn(idx > 0 && "mt-6")}>
            {!collapsed && (
              <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {NAV_SECTIONS[section]}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {NAV_ENTRIES.filter((entry) => entry.section === section)
                .filter((entry) => {
                  // Only show the User Management link to admin users
                  if (entry.path === "/app/settings/users") {
                    return user?.role === "admin";
                  }
                  return true;
                })
                .map((entry) => (
                  <SidebarLink key={entry.path} entry={entry} collapsed={collapsed} />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        {!collapsed && (
          <div className="hud-panel mb-2 rounded-md border border-border bg-secondary/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">System status</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-foreground">All feeds nominal</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary/30 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ entry, collapsed }: { entry: NavEntry; collapsed: boolean }) {
  const Icon = entry.icon;
  const link = (
    <NavLink
      to={entry.path}
      end={entry.path === APP_HOME}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0 py-2.5",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {!collapsed && (
            <span
              className={cn(
                "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
          )}
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
          {!collapsed && <span className="truncate">{entry.label}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{entry.label}</TooltipContent>
    </Tooltip>
  );
}
