import { useQuery } from "@tanstack/react-query";

import { getSystemHealth, type SystemHealth } from "@/lib/api-client";

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: getSystemHealth,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}
