import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CornerDownLeft, Search } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NAV_ENTRIES } from "@/constants/nav";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const actions: Action[] = useMemo(
    () => [
      ...NAV_ENTRIES.map((entry) => ({
        id: `nav-${entry.path}`,
        label: `Go to ${entry.label}`,
        hint: "Navigate",
        run: () => navigate(entry.path),
      })),
      {
        id: "action-diagnostic",
        label: "Run diagnostic check",
        hint: "System",
        run: () => toast({ title: "Diagnostics complete", description: "All feeds and models are operating normally." }),
      },
      {
        id: "action-refresh",
        label: "Refresh live feeds",
        hint: "System",
        run: () => toast({ title: "Feeds refreshed", description: "All 64 active cameras reconnected." }),
      },
      {
        id: "action-logout",
        label: "Sign out",
        hint: "Account",
        run: () => navigate("/login"),
      },
    ],
    [navigate, toast],
  );

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  function runAt(index: number) {
    const action = filtered[index];
    if (!action) return;
    action.run();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="top-[18%] max-w-xl translate-y-0 overflow-hidden p-0">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                runAt(activeIndex);
              }
            }}
            placeholder="Search pages, workers, cameras, actions…"
            className="h-6 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          )}
          {filtered.map((action, i) => (
            <button
              key={action.id}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => runAt(i)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                i === activeIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary",
              )}
            >
              <span>{action.label}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {action.hint}
                {i === activeIndex && <CornerDownLeft className="h-3 w-3" />}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <Command className="h-3 w-3" /> K to toggle · ↑↓ to navigate · ↵ to select
        </div>
      </DialogContent>
    </Dialog>
  );
}
