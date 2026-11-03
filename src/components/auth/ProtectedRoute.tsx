import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldHalf } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

/**
 * Gates the authenticated app shell. While the persisted session is being
 * validated it shows a lightweight splash; once resolved it either renders the
 * protected tree or redirects to /login, preserving the attempted location so
 * the user lands back where they were headed after signing in.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-ambient text-muted-foreground">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <ShieldHalf className="h-6 w-6 text-primary" strokeWidth={2.25} />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Restoring secure session…
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
