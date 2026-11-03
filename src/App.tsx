import { RouterProvider } from "react-router-dom";

import { router } from "@/router";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <TooltipProvider delayDuration={200}>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
