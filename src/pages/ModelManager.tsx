import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { LiveModelStatusCard } from "@/components/models/LiveModelStatusCard";
import { ReloadModelButton } from "@/components/models/CurrentModelCard";
import { BenchmarkTable } from "@/components/models/BenchmarkTable";
import { HardwareInfoPanel } from "@/components/models/HardwareInfoPanel";
import { ApiError, getModelStatus, reloadModel, type ModelStatus } from "@/lib/api-client";

export default function ModelManager() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  async function fetchStatus() {
    setLoading(true);
    setError(null);
    try {
      const result = await getModelStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStatus();
  }, []);

  async function handleReload() {
    setReloading(true);
    try {
      const result = await reloadModel();
      setStatus(result);
      toast({
        title: result.is_loaded ? "Model reloaded" : "Reload attempted",
        description: result.is_loaded
          ? `${result.model_path} is now active.`
          : result.load_error ?? "No weights found — the model remains unloaded.",
        variant: result.is_loaded ? "success" : "destructive",
      });
    } catch (err) {
      toast({
        title: "Reload failed",
        description: err instanceof ApiError ? err.message : "Could not reach the backend.",
        variant: "destructive",
      });
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
            <Cpu className="h-5 w-5 text-detect" />
            Model Manager
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live status of the PPE detection model (YOLOv8n, 10 classes) and its measured performance.
          </p>
        </div>
        <ReloadModelButton onReload={() => void handleReload()} reloading={reloading} />
      </motion.div>

      <LiveModelStatusCard status={status} loading={loading} error={error} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BenchmarkTable status={status} />
        <HardwareInfoPanel status={status} />
      </div>

    </div>
  );
}
