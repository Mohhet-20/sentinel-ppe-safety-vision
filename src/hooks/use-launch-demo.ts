import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DEMO_CREDENTIALS, setDemoMode } from "@/lib/demo/demo-mode";
import { useAuth } from "@/providers/AuthProvider";

/** One click from the landing page into a fully working, backend-free session. */
export function useLaunchDemo() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  const launch = useCallback(
    async (to = "/app") => {
      setLaunching(true);
      try {
        setDemoMode(true);
        await login(DEMO_CREDENTIALS.identifier, DEMO_CREDENTIALS.password);
        navigate(to);
      } finally {
        setLaunching(false);
      }
    },
    [login, navigate],
  );

  return { launch, launching };
}
