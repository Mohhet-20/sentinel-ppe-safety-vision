import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReloadModelButton({ onReload, reloading }: { onReload: () => void; reloading: boolean }) {
  return (
    <Button size="sm" variant="secondary" onClick={onReload} disabled={reloading}>
      <RotateCw className={reloading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {reloading ? "Reloading…" : "Reload model"}
    </Button>
  );
}
