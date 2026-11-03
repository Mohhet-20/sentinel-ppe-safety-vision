import { useLocation } from "react-router-dom";
import { Command, Menu, Search } from "lucide-react";

import { APP_HOME, NAV_ENTRIES } from "@/constants/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { StatusChips } from "@/components/shell/StatusChips";
import { LiveClock } from "@/components/shell/LiveClock";
import { FullscreenToggle } from "@/components/shell/FullscreenToggle";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { NotificationCenter } from "@/components/shell/NotificationCenter";
import { UserMenu } from "@/components/shell/UserMenu";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const current = NAV_ENTRIES.find((entry) =>
    entry.path === APP_HOME ? location.pathname === APP_HOME : location.pathname.startsWith(entry.path),
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-col leading-tight">
        <Breadcrumbs />
        <h1 className="font-display text-lg font-semibold tracking-wide text-foreground">
          {current?.label ?? "Dashboard"}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <StatusChips />

        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="hidden items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-3 flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <LiveClock />

        <Badge variant="success" className="hidden sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          LIVE
        </Badge>

        <FullscreenToggle />
        <ThemeSwitch />
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
