import { SlidersHorizontal, Sun, Contrast, Target, SplitSquareHorizontal, ScanEye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface ImageAdjustPanelProps {
  brightness: number;
  setBrightness: (v: number) => void;
  contrast: number;
  setContrast: (v: number) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  showBoxes: boolean;
  setShowBoxes: (v: boolean) => void;
  splitMode: boolean;
  setSplitMode: (v: boolean) => void;
}

export function ImageAdjustPanel({
  brightness,
  setBrightness,
  contrast,
  setContrast,
  confidenceThreshold,
  setConfidenceThreshold,
  showBoxes,
  setShowBoxes,
  splitMode,
  setSplitMode,
}: ImageAdjustPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-1">
        <RowSlider icon={Sun} label="Brightness" value={brightness} onChange={setBrightness} min={50} max={150} suffix="%" />
        <RowSlider icon={Contrast} label="Contrast" value={contrast} onChange={setContrast} min={50} max={150} suffix="%" />
        <RowSlider
          icon={Target}
          label="Confidence threshold"
          value={Math.round(confidenceThreshold * 100)}
          onChange={(v) => setConfidenceThreshold(v / 100)}
          min={0}
          max={100}
          suffix="%"
        />

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <ScanEye className="h-3.5 w-3.5 text-muted-foreground" /> Show detections
          </span>
          <Switch checked={showBoxes} onCheckedChange={setShowBoxes} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <SplitSquareHorizontal className="h-3.5 w-3.5 text-muted-foreground" /> Before / after split
          </span>
          <Switch checked={splitMode} onCheckedChange={setSplitMode} />
        </div>
      </CardContent>
    </Card>
  );
}

function RowSlider({
  icon: Icon,
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  icon: typeof Sun;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider aria-label={label} min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
