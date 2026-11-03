import { FileImage } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ImageMetadata {
  fileName: string;
  fileType: string;
  fileSizeKb: number;
  width: number;
  height: number;
  uploadedAt: string;
}

export function MetadataPanel({ metadata }: { metadata: ImageMetadata | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileImage className="h-4 w-4 text-primary" />
          Metadata
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {!metadata ? (
          <p className="text-xs text-muted-foreground">Upload an image to see file details.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-y-2 text-xs">
            <Row label="File name" value={metadata.fileName} span />
            <Row label="Type" value={metadata.fileType || "unknown"} />
            <Row label="Size" value={`${metadata.fileSizeKb.toFixed(0)} KB`} />
            <Row label="Dimensions" value={`${metadata.width} × ${metadata.height}`} span />
            <Row label="Uploaded" value={metadata.uploadedAt} span />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground">{value}</dd>
    </div>
  );
}
