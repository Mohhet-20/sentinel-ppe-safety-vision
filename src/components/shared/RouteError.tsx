import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Last-resort boundary for a crashed route, so one broken page never blanks the whole app. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ambient px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/15">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-1 max-w-md font-mono text-xs text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>
          <RotateCcw className="h-4 w-4" /> Reload
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
