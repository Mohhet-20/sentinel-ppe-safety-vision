import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SectionCard({
  title,
  description,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {right}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-1">{children}</CardContent>
    </Card>
  );
}
