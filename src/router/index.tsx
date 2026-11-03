import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { RouteError } from "@/components/shared/RouteError";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Every product page is its own chunk, so the public landing page stays light.
const page = (load: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, "lazy"> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const router = createBrowserRouter([
  { path: "/", element: <Landing />, errorElement: <RouteError /> },
  { path: "/login", element: <Login />, errorElement: <RouteError /> },
  {
    path: "/app",
    lazy: async () => {
      const [{ AppShell }, { ProtectedRoute }] = await Promise.all([
        import("@/components/layout/AppShell"),
        import("@/components/auth/ProtectedRoute"),
      ]);
      return {
        Component: () => (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
      };
    },
    errorElement: <RouteError />,
    children: [
      { index: true, ...page(() => import("@/pages/Dashboard")) },
      { path: "detection/image", ...page(() => import("@/pages/ImageDetection")) },
      { path: "detection/video", ...page(() => import("@/pages/VideoDetection")) },
      { path: "detection/live", ...page(() => import("@/pages/LiveWebcam")) },
      { path: "analytics", ...page(() => import("@/pages/Analytics")) },
      { path: "incidents", ...page(() => import("@/pages/IncidentCenter")) },
      { path: "workers", ...page(() => import("@/pages/Workers")) },
      { path: "reports", ...page(() => import("@/pages/Reports")) },
      { path: "models", ...page(() => import("@/pages/ModelManager")) },
      { path: "system", ...page(() => import("@/pages/SystemHealth")) },
      { path: "settings", ...page(() => import("@/pages/Settings")) },
      { path: "settings/users", ...page(() => import("@/pages/UserManagement")) },
      { path: "about", ...page(() => import("@/pages/About")) },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
