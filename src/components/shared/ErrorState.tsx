import { motion } from "framer-motion";
import { AlertOctagon, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "This module couldn't load its data. Try again, or check back shortly.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-lg border border-danger/25 bg-danger/[0.04] px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertOctagon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-1">
          <RotateCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </motion.div>
  );
}
