import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { DemoBanner } from "@/components/layout/DemoBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { LiveAlerts } from "@/components/shell/LiveAlerts";
import { APP_HOME, NAV_ENTRIES } from "@/constants/nav";
import { cn } from "@/lib/utils";
import { LiveChannelProvider } from "@/providers/LiveChannelProvider";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <LiveChannelProvider>
      <div className="flex h-screen w-full overflow-hidden bg-ambient">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <CommandPalette />
        <LiveAlerts />

        {/* mobile drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              className="fixed inset-0 z-40 flex lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.div
                className="relative flex h-full w-72 flex-col bg-card p-4"
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
              >
                <button
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="mb-4 font-display text-sm font-bold tracking-[0.08em] text-foreground">SENTINEL</p>
                <nav className="flex flex-col gap-1">
                  {NAV_ENTRIES.map((entry) => (
                    <NavLink
                      key={entry.path}
                      to={entry.path}
                      end={entry.path === APP_HOME}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )
                      }
                    >
                      <entry.icon className="h-4 w-4" />
                      {entry.label}
                    </NavLink>
                  ))}
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <DemoBanner />
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="container py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </LiveChannelProvider>
  );
}
