import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

import { APP_HOME, NAV_ENTRIES } from "@/constants/nav";

export function Breadcrumbs() {
  const location = useLocation();
  const current = NAV_ENTRIES.find((entry) =>
    entry.path === APP_HOME ? location.pathname === APP_HOME : location.pathname.startsWith(entry.path),
  );

  const segments = [
    { label: "Sentinel", path: APP_HOME },
    ...(current && current.path !== APP_HOME ? [{ label: current.label, path: current.path }] : []),
  ];

  return (
    <nav className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
      {segments.map((seg, i) => (
        <Fragment key={seg.path}>
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {i === segments.length - 1 ? (
            <span className="font-medium text-foreground">{seg.label}</span>
          ) : (
            <Link to={seg.path} className="flex items-center gap-1 hover:text-foreground">
              {i === 0 && <Home className="h-3 w-3" />}
              {seg.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
