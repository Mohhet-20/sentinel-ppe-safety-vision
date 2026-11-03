import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const ICONS = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertTriangle,
  detect: Info,
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const Icon = ICONS[(variant ?? "default") as keyof typeof ICONS];
        const iconColor =
          variant === "success" ? "text-success" : variant === "destructive" ? "text-danger" : variant === "detect" ? "text-detect" : "text-primary";
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="grid flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
