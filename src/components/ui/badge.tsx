import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors font-mono tracking-tight",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        detect: "border-transparent bg-detect/15 text-detect",
        danger: "border-transparent bg-danger/15 text-danger",
        success: "border-transparent bg-success/15 text-success",
        outline: "border-border text-muted-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
